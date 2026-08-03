import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/requireAdmin";
import { safeClerkUserId } from "@/lib/safe-auth";
import { db } from "@/lib/prisma";
import { calculateBusinessCardPrice } from "@/lib/pricing/business-cards";
import { isTestOrderCode } from "@/lib/pricing/test-order";
import { TERMS_VERSION } from "@/lib/legal/terms";

const bcSpecSchema = z.object({
  sizeId: z.number(),
  paperId: z.number(),
  colorId: z.number(),
  quantity: z.number(),
  rush: z.boolean(),
  roundCorners: z.boolean(),
  manualProof: z.boolean(),
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
      path: z.enum(["UPLOAD", "DESIGN_SERVICE"]).nullable(),
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
      // How the customer positioned the artwork on the sheet. Stored so the print file is produced
      // from exactly the placement they approved, not re-fitted at output time.
      placement: z
        .object({
          // Per axis, so a customer who stretched the artwork gets printed what they approved.
          scaleX: z.number().positive(),
          scaleY: z.number().positive(),
          offsetXIn: z.number(),
          offsetYIn: z.number(),
          rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
        })
        .nullable()
        .optional(),
      approved: z.boolean(),
    })
    .optional(),
  /** Secret that makes this a free test order. Validated here; never trusted from the client. */
  testCode: z.string().optional(),
});

export async function POST(req: Request) {
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

  const { service, selectedPackage, selectedAddOns, quantity, bcSpec, guestEmail, artwork, acceptedTerms, testCode, ...config } = parsed.data;

  if (!acceptedTerms) {
    return NextResponse.json(
      { error: "Please accept the Terms of Sale to place your order", details: { fieldErrors: { acceptedTerms: ["Required"] } } },
      { status: 400 }
    );
  }

  // Checked before anything is priced. A wrong code is refused outright rather than quietly falling
  // back to the real price, so a mistyped test link cannot bill someone for a live print run.
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

  if (service === "business-cards") {
    if (!bcSpec) return NextResponse.json({ error: "Missing print specifications" }, { status: 400 });
    const priced = calculateBusinessCardPrice(bcSpec);
    if (!priced.valid) return NextResponse.json({ error: priced.error ?? "Invalid print specifications" }, { status: 400 });
    printPrice = priced.total;
    orderQuantity = bcSpec.quantity;
  } else {
    // Every other service still requires choosing a package — its price is the whole product cost.
    if (!packageTier) return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  const total = freeTestOrder ? 0 : round2(printPrice + (packageTier?.price ?? 0) + addOnsTotal);

  const order = await db.order.create({
    data: {
      userId: user?.id ?? null,
      guestEmail: user ? null : guestEmail,
      status: "DRAFT",
      total,
      // An uploaded file is only accepted as approved when the client says the box was ticked; the
      // timestamp is set here, server-side, so it reflects when we recorded the consent.
      artworkPath: artwork?.path === "UPLOAD" ? "UPLOAD" : "DESIGN_SERVICE",
      artworkFileUrl: artwork?.path === "UPLOAD" ? artwork.fileUrl : null,
      artworkFileName: artwork?.path === "UPLOAD" ? artwork.fileName : null,
      artworkWidthIn: artwork?.inspection?.widthIn ?? null,
      artworkHeightIn: artwork?.inspection?.heightIn ?? null,
      artworkDpi: artwork?.inspection?.effectiveDpi ? Math.round(artwork.inspection.effectiveDpi) : null,
      artworkFitApplied: artwork?.inspection ? artwork.inspection.matchesRequiredSize === false : false,
      artworkPlacement: artwork?.path === "UPLOAD" && artwork.placement ? artwork.placement : undefined,
      proofApprovedAt: artwork?.path === "UPLOAD" && artwork.approved ? new Date() : null,
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
          config: { ...config, selectedAddOns, bcSpec: bcSpec ?? null, testOrder: freeTestOrder },
        },
      },
    },
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
