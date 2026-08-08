import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/requireAdmin";
import { safeClerkUserId } from "@/lib/safe-auth";
import { db } from "@/lib/prisma";
import { calculateBusinessCardPrice } from "@/lib/pricing/business-cards";
import { calculateBannerPrice } from "@/lib/pricing/banners-server";
import { grommetPrice, isGrommetPriced } from "@/lib/pricing/banner-finishing-server";
import { calculatePostcardPrice } from "@/lib/pricing/postcards";
import { calculateRigidSignPrice } from "@/lib/pricing/rigid-signs-server";
import { calculateWindowDecalPrice } from "@/lib/pricing/window-decals-server";
import { isTestOrderCode } from "@/lib/pricing/test-order";
import { getPricingSettings } from "@/lib/pricing/settings-server";
import { TERMS_VERSION } from "@/lib/legal/terms";
import { recordOrderEvent } from "@/lib/orders/events";
import { clientKey, rateLimited } from "@/lib/rate-limit";

const bcSpecSchema = z.object({
  sizeId: z.number(),
  paperId: z.number(),
  colorId: z.number(),
  quantity: z.number(),
  rush: z.boolean(),
  roundCorners: z.boolean(),
  manualProof: z.boolean(),
});

/**
 * One printed face, as the client reports it.
 *
 * Re-derived rather than trusted wholesale: only the file reference, the measured size and the
 * approval flag are kept, and the approval timestamp is stamped server-side.
 */
const artworkSideSchema = z.object({
  fileUrl: z.string().url().nullable(),
  fileName: z.string().max(300).nullable(),
  inspection: z
    .object({
      widthIn: z.number().optional(),
      heightIn: z.number().optional(),
      effectiveDpi: z.number().optional(),
      matchesRequiredSize: z.boolean().optional(),
    })
    .passthrough()
    .nullable(),
  placement: z
    .object({
      scaleX: z.number().positive(),
      scaleY: z.number().positive(),
      offsetXIn: z.number(),
      offsetYIn: z.number(),
      rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
    })
    .nullable()
    .optional(),
  approved: z.boolean(),
});

const schema = z.object({
  service: z.string().min(1),
  // Optional overall: business cards allow "design it myself" (no package). Enforced as required
  // for every other service below, since those don't have a real print-pricing path yet.
  selectedPackage: z.string().optional(),
  selectedAddOns: z.array(z.string()).optional().default([]),
  // Optional overall: only the design path needs it (enforced below), since an upload-path
  // order has no design brief to attach a business name to.
  businessName: z.string().default(""),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  colorPaletteId: z.string().optional(),
  brandColorsNotes: z.string().optional(),
  brandFiles: z.array(z.object({ url: z.string(), name: z.string() })).optional().default([]),
  notes: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  cardDesignId: z.string().optional(),
  bcSpec: bcSpecSchema.optional(),
  /** Banners are described by label rather than numeric ids. */
  bannerSpec: z
    .object({
      size: z.string().max(60),
      material: z.string().max(80),
      quantity: z.number().int().positive(),
      grommets: z.string().max(60).optional(),
    })
    .optional(),
  postcardSpec: z
    .object({
      size: z.string().max(60),
      paper: z.string().max(80),
      color: z.string().max(80),
      quantity: z.number().int().positive(),
    })
    .optional(),
  /** Rigid signs are described by the supplier's numeric ids, since labels are not unique. */
  rigidSpec: z
    .object({
      material: z.enum(["yard-signs", "corrugated-boards", "pvc-boards", "foam-boards", "aluminum-boards"]),
      sizeId: z.number().int().positive(),
      shapeId: z.number().int().positive(),
      thickness: z.string().max(8),
      type: z.string().max(8),
      color: z.string().max(8),
      quantity: z.number().int().positive(),
    })
    .optional(),
  /** Window signage, likewise by supplier id: size and shape labels are not unique here either. */
  windowSpec: z
    .object({
      material: z.enum(["window-decals", "window-clings", "window-perfs"]),
      sizeId: z.number().int().positive(),
      shapeId: z.number().int().positive(),
      quantity: z.number().int().positive(),
    })
    .optional(),
  // Only required for guests (see the userId check below) — a signed-in user's account email is
  // used instead, but the field is accepted either way so the client doesn't need to know the
  // customer's auth state before submitting.
  guestEmail: z.string().email().optional(),
  acceptedTerms: z.boolean().optional(),
  // Business cards only. The proof approval is a consent record, so it is stored on the order
  // rather than buried in the item config, and re-derived here from the client payload rather than
  // trusted wholesale: only the file reference, the measured size and the approval flag are kept.
  artwork: z
    .object({
      path: z.enum(["UPLOAD", "DESIGN_SERVICE", "STUDIO"]).nullable(),
      front: artworkSideSchema,
      // Only present on the grayscale-back and both-sides print options.
      back: artworkSideSchema.optional(),
    })
    .optional(),
  /** Secret that makes this a free test order. Validated here; never trusted from the client. */
  testCode: z.string().optional(),
});

export async function POST(req: Request) {
  // Unauthenticated by design (guest checkout), so a single caller could otherwise create order
  // rows without limit - a burst of six in a row was accepted during the audit. Generous enough
  // that a customer revising and resubmitting is never caught by it.
  if (rateLimited(clientKey(req), { name: "orders", windowMs: 10 * 60 * 1000, max: 12 })) {
    return NextResponse.json(
      { error: "Too many orders from this connection. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  // Guest checkout: purchasing doesn't require an account, only AI features do. Resolve the
  // signed-in user if there is one, but don't hard-block anonymous requests the way requireAuth()
  // does — a guest just needs a valid email so there's somewhere to send confirmation and files.
  const clerkId = await safeClerkUserId();
  const user = clerkId ? await db.user.findUnique({ where: { clerkId } }) : null;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.artwork?.path !== "UPLOAD" && !parsed.data.businessName?.trim()) {
    return NextResponse.json(
      { error: "Business name is required", details: { fieldErrors: { businessName: ["Business name is required"] } } },
      { status: 400 }
    );
  }

  if (!user && !parsed.data.guestEmail) {
    return NextResponse.json({ error: "Email is required to check out as a guest", details: { fieldErrors: { guestEmail: ["Email is required"] } } }, { status: 400 });
  }

  const { service, selectedPackage, selectedAddOns, quantity, bcSpec, bannerSpec, postcardSpec, rigidSpec, windowSpec, cardDesignId, guestEmail, artwork, acceptedTerms, testCode, ...config } = parsed.data;

  if (!acceptedTerms) {
    return NextResponse.json(
      { error: "Please accept the Terms of Sale to place your order", details: { fieldErrors: { acceptedTerms: ["Required"] } } },
      { status: 400 }
    );
  }

  // Checked before anything is priced. A wrong code is refused outright rather than quietly falling
  // back to the real price, so a mistyped test link cannot bill someone for a live print run.
  const upload = artwork?.path === "UPLOAD";
  const front = artwork?.front;
  const back = artwork?.back;

  const freeTestOrder = isTestOrderCode(testCode);
  if (testCode && !freeTestOrder) {
    return NextResponse.json({ error: "That test link is not valid." }, { status: 403 });
  }

  const product = await db.product.findUnique({ where: { slug: service }, include: { packages: true, addOns: true } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const packageTier = selectedPackage ? product.packages.find((p: { name: string; price: number }) => p.name === selectedPackage) : null;
  if (selectedPackage && !packageTier) return NextResponse.json({ error: "Package not found" }, { status: 404 });

  const addOnsTotal = selectedAddOns.reduce((sum: number, name: string) => {
    const ao = product.addOns.find((a: { name: string; price: number }) => a.name === name);
    return sum + (ao?.price ?? 0);
  }, 0);

  let printPrice = 0;
  let orderQuantity = quantity;

  if (service === "postcards" && postcardSpec) {
    // Priced server-side from the same table the builder quoted from, so a tampered client cannot
    // choose its own figure - and an unavailable paper/colour combination is refused here too.
    const priced = calculatePostcardPrice(postcardSpec);
    if (!priced.valid) return NextResponse.json({ error: priced.error ?? "Invalid postcard specification" }, { status: 400 });
    printPrice = priced.total;
    orderQuantity = postcardSpec.quantity;
  } else if (service === "banners" && bannerSpec) {
    // Priced server-side from the same table the builder quoted from, so a tampered client cannot
    // choose its own figure.
    const priced = calculateBannerPrice(bannerSpec);
    if (!priced.valid) return NextResponse.json({ error: priced.error ?? "Invalid banner specification" }, { status: 400 });
    // Grommets are a supplier-quoted extra on top of the base curve. Priced here from the same
    // table the builder quoted from; an unquoted choice is refused rather than silently free,
    // since print sells at cost and a missed extra is a loss on the job.
    const grommets = bannerSpec.grommets ?? "No Grommets";
    if (grommets !== "No Grommets" && !isGrommetPriced(bannerSpec.size, grommets, bannerSpec.quantity)) {
      return NextResponse.json({ error: "That grommet option isn't available for this banner size and quantity." }, { status: 400 });
    }
    printPrice = round2(priced.total + grommetPrice(bannerSpec.size, grommets, bannerSpec.quantity));
    orderQuantity = bannerSpec.quantity;
  } else if (service === "rigid-signs" && rigidSpec) {
    // Priced server-side from the same tables the builder quoted from. Those tables are two
    // megabytes and never reach the browser, so unlike the other products the client could not have
    // computed this figure itself - which makes pricing here the only pricing that happens.
    const priced = calculateRigidSignPrice(rigidSpec);
    if (!priced.valid) return NextResponse.json({ error: priced.error ?? "Invalid rigid sign specification" }, { status: 400 });
    printPrice = priced.total;
    orderQuantity = rigidSpec.quantity;
  } else if (service === "window-decals" && windowSpec) {
    // Priced server-side from the same tables the builder quoted from. As with rigid signs those
    // tables never reach the browser, so the client could not have computed this figure itself -
    // which makes pricing here the only pricing that happens.
    const priced = calculateWindowDecalPrice(windowSpec);
    if (!priced.valid) return NextResponse.json({ error: priced.error ?? "Invalid window signage specification" }, { status: 400 });
    printPrice = priced.total;
    orderQuantity = windowSpec.quantity;
  } else if (service === "business-cards") {
    if (!bcSpec) return NextResponse.json({ error: "Missing print specifications" }, { status: 400 });
    const priced = calculateBusinessCardPrice(bcSpec, await getPricingSettings());
    if (!priced.valid) return NextResponse.json({ error: priced.error ?? "Invalid print specifications" }, { status: 400 });
    printPrice = priced.total;
    orderQuantity = bcSpec.quantity;
  } else {
    // Every other service still requires choosing a package — its price is the whole product cost.
    if (!packageTier) return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  const total = freeTestOrder ? 0 : round2(printPrice + (packageTier?.price ?? 0) + addOnsTotal);

  // A design id can arrive from a stale link or a cleared draft. Confirming it exists keeps a bad
  // reference from failing the insert and losing an order the customer is trying to place.
  const studioOrder = artwork?.path === "STUDIO";
  const designExists = cardDesignId
    ? Boolean(await db.cardDesign.findUnique({ where: { id: cardDesignId }, select: { id: true } }))
    : false;

  const order = await db.order.create({
    data: {
      userId: user?.id ?? null,
      guestEmail: user ? null : guestEmail,
      status: "DRAFT",
      total,
      // An uploaded file is only accepted as approved when the client says the box was ticked; the
      // timestamp is set here, server-side, so it reflects when we recorded the consent.
      // A studio design is its own thing: no file was uploaded and no designer was booked. Recording
      // it as UPLOAD made the order claim a file that does not exist, and the dashboard flagged it
      // "proof not approved" permanently, since an upload's proof cannot be approved with nothing
      // uploaded.
      artworkPath: artwork?.path === "UPLOAD" ? "UPLOAD" : studioOrder ? "STUDIO" : "DESIGN_SERVICE",
      // The Design Studio design being printed, as a real column rather than only inside the item
      // config, so production can query for it and admin can show and download it. Verified to
      // exist first: a stale id from a cleared draft would otherwise fail the whole insert on the
      // foreign key, losing the order over a broken reference.
      cardDesignId: designExists ? cardDesignId : null,
      artworkFileUrl: upload ? front?.fileUrl ?? null : null,
      artworkFileName: upload ? front?.fileName ?? null : null,
      artworkWidthIn: front?.inspection?.widthIn ?? null,
      artworkHeightIn: front?.inspection?.heightIn ?? null,
      artworkDpi: front?.inspection?.effectiveDpi ? Math.round(front.inspection.effectiveDpi) : null,
      artworkFitApplied: front?.inspection ? front.inspection.matchesRequiredSize === false : false,
      artworkPlacement: upload && front?.placement ? front.placement : undefined,
      // The studio's own proof screen gathers the same approval before it hands over to the order,
      // so a studio order carries a real consent record too.
      proofApprovedAt: (upload && front?.approved) || (studioOrder && front?.approved) ? new Date() : null,

      backArtworkFileUrl: upload ? back?.fileUrl ?? null : null,
      backArtworkFileName: upload ? back?.fileName ?? null : null,
      backArtworkWidthIn: back?.inspection?.widthIn ?? null,
      backArtworkHeightIn: back?.inspection?.heightIn ?? null,
      backArtworkDpi: back?.inspection?.effectiveDpi ? Math.round(back.inspection.effectiveDpi) : null,
      backArtworkPlacement: upload && back?.placement ? back.placement : undefined,
      backProofApprovedAt: upload && back?.approved ? new Date() : null,
      // Stamped server-side so the record reflects when we actually received the agreement.
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: new Date(),
      items: {
        create: {
          productId: product.id,
          packageTierId: packageTier?.id ?? null,
          addOnIds: selectedAddOns,
          quantity: orderQuantity,
          price: total,
          config: { ...config, cardDesignId: cardDesignId ?? null, selectedAddOns, bcSpec: bcSpec ?? null, bannerSpec: bannerSpec ?? null, postcardSpec: postcardSpec ?? null, rigidSpec: rigidSpec ?? null, windowSpec: windowSpec ?? null, testOrder: freeTestOrder },
        },
      },
    },
  });

  await recordOrderEvent({
    orderId: order.id,
    kind: "created",
    status: order.status,
    message: freeTestOrder
      ? `Free test order placed for ${orderQuantity} x ${product.name}`
      : `Order placed by ${user?.email ?? guestEmail ?? "a guest"} for ${orderQuantity} x ${product.name}`,
  });

  return NextResponse.json({ orderId: order.id });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function GET() {
  const { error, user } = await requireAuth();
  if (error) return error;

  const orders = await db.order.findMany({
    where: { userId: user!.id },
    include: { items: { include: { product: true, packageTier: true } }, project: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}
