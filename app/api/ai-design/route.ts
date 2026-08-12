import { NextResponse } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { BLEED_WIDTH_IN, BLEED_HEIGHT_IN } from "@/lib/business-card/print-spec";
import { db } from "@/lib/prisma";
import { safeClerkUserId } from "@/lib/safe-auth";
import { generateImageWithOpenRouter } from "@/lib/openrouter";
import { FREE_AI_DESIGN_LIMIT } from "@/lib/business-card/ai-design-limit";
import { PRODUCT_DB_VALUE, type DesignProduct } from "@/lib/business-card/print-spec";
import { resolveAiPalette } from "@/lib/business-card/templates/ai-palettes";
import { buildCustomBusinessCard, buildCustomPostcard, buildCustomBanner, type BannerFormat } from "@/lib/business-card/templates/ai-custom";
import { AI_CONCEPTS, buildConceptPrompt, type AiConcept } from "@/lib/business-card/templates/ai-concepts";
import { buildWatermarkedPreview } from "@/lib/business-card/watermark";

// AI generation requires a signed-in account (purchasing does not — see app/api/orders) so usage
// is tied to a real identity rather than a browser-local anonymousToken that resets the moment
// someone clears storage or switches devices.
async function resolveIdentity(): Promise<{ userId: string } | null> {
  const clerkId = await safeClerkUserId();
  if (!clerkId) return null;
  const user = await db.user.findUnique({ where: { clerkId } });
  return user ? { userId: user.id } : null;
}

async function usageFor(identity: { userId: string }): Promise<number> {
  return db.aiDesignGeneration.count({ where: { userId: identity.userId } });
}

export async function GET() {
  const identity = await resolveIdentity();
  if (!identity) return NextResponse.json({ requiresSignIn: true, used: 0, limit: FREE_AI_DESIGN_LIMIT, remaining: 0 });

  const used = await usageFor(identity);
  return NextResponse.json({ requiresSignIn: false, used, limit: FREE_AI_DESIGN_LIMIT, remaining: Math.max(0, FREE_AI_DESIGN_LIMIT - used) });
}

const bodySchema = z.object({
  product: z.enum(["business-card", "postcard", "banner"]),
  bannerFormat: z.enum(["rollup", "vinyl"]).default("vinyl"),
  businessName: z.string().min(1).max(80),
  tagline: z.string().max(80).default(""),
  description: z.string().min(1).max(200),
  phone: z.string().min(1).max(40),
  email: z.string().max(120).default(""),
  website: z.string().max(120).default(""),
  linkedin: z.string().max(160).default(""),
  address: z.string().max(160).default(""),
  colorPaletteId: z.string().default("auto"),
  includeQrCode: z.boolean().default(false),
  /**
   * Finished size of the piece being designed, in inches.
   *
   * Optional so existing callers keep working, but it is what makes the generated background match
   * what the customer actually chose. Without it a postcard was always composed at 6 x 4 and a
   * banner at 2:1, so a 6 x 11 postcard or a 4 x 4 ft banner had most of the image cropped away.
   */
  trimWidthIn: z.number().positive().max(600).optional(),
  trimHeightIn: z.number().positive().max(600).optional(),
});

/**
 * Full-bleed AI backgrounds have to match the document's aspect ratio, or the image is distorted
 * (or letterboxed) once it is placed edge to edge on the card.
 *
 * Height is derived from the real document size rather than hardcoded, so a change to the bleed
 * spec cannot silently desync this. Business cards were pinned at 1500x900 (5:3), which matched the
 * old 3.75 x 2.25 document; the current 3.6 x 2.1 document is 12:7.
 */
/** Fallback finished sizes, used only when the caller does not say what was chosen. */
const DEFAULT_TRIM_IN: Record<DesignProduct, { w: number; h: number }> = {
  "business-card": { w: BLEED_WIDTH_IN, h: BLEED_HEIGHT_IN },
  postcard: { w: 6, h: 4 },
  banner: { w: 72, h: 36 },
  "rigid-sign": { w: 24, h: 18 },
  "window-decal": { w: 24, h: 18 },
};

/**
 * Pixel budget per product, spent on whatever aspect ratio the piece actually is.
 *
 * A business card is held in the hand and needs real resolution across a few inches; a banner is
 * read from across a car park and needs a lot of pixels but only 150 DPI of them. Both are capped
 * so a single generation cannot produce a file too large to hand back through a JSON response.
 */
const TARGET_LONG_EDGE_PX: Record<DesignProduct, number> = {
  "business-card": 1500,
  postcard: 1800,
  banner: 9000,
  "rigid-sign": 4000,
  // Read from the pavement rather than held, like a banner, but a window graphic tops out at 5 ft
  // rather than 20, so it needs fewer pixels to hit the same 150 DPI.
  "window-decal": 5000,
};

/**
 * Target raster for a piece of a given finished size.
 *
 * The ratio comes from the chosen dimensions, so a 4 x 4 ft banner is generated square and a 6 x 11
 * postcard is generated tall. Previously both were forced to a fixed ratio and then cover-cropped,
 * which quietly threw away whatever the model had composed outside the crop.
 */
function targetRaster(product: DesignProduct, widthIn: number, heightIn: number): { w: number; h: number } {
  const longEdge = TARGET_LONG_EDGE_PX[product];
  const ratio = widthIn / heightIn;
  return ratio >= 1
    ? { w: longEdge, h: Math.max(1, Math.round(longEdge / ratio)) }
    : { w: Math.max(1, Math.round(longEdge * ratio)), h: longEdge };
}

/** "3:2", "1:1", "9:16" - the closest small whole-number ratio, for the prompt. */
function ratioLabel(widthIn: number, heightIn: number): string {
  const gcd = (a: number, b: number): number => (b < 1 ? a : gcd(b, a % b));
  const w = Math.round(widthIn * 100);
  const h = Math.round(heightIn * 100);
  const d = gcd(Math.max(w, h), Math.min(w, h)) || 1;
  let rw = Math.round(w / d);
  let rh = Math.round(h / d);
  // Keep it readable; an exact but absurd ratio helps nobody.
  while (rw > 32 || rh > 32) { rw = Math.round(rw / 2); rh = Math.round(rh / 2); }
  return `${Math.max(1, rw)}:${Math.max(1, rh)}`;
}

/** "landscape", "portrait" or "square" - the model composes to this, and the rest is cropped. */
function shapeOf(widthIn: number, heightIn: number): string {
  if (Math.abs(widthIn - heightIn) / Math.max(widthIn, heightIn) < 0.05) return "square";
  return widthIn > heightIn ? "landscape" : "portrait";
}

/**
 * How many concepts one generation returns.
 *
 * Four is the number the brief asks for and about the number a person can actually compare at once.
 * They are produced concurrently - four sequential image calls would take most of a minute, which
 * is long enough that people leave.
 */
const CONCEPTS_PER_RUN = 4;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const identity = await resolveIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in to use AI design generation" }, { status: 401 });

  const used = await usageFor(identity);
  if (used >= FREE_AI_DESIGN_LIMIT) {
    return NextResponse.json({ error: "limit-reached", used, limit: FREE_AI_DESIGN_LIMIT }, { status: 429 });
  }

  const product = data.product;
  const isRollup = product === "banner" && data.bannerFormat === "rollup";

  // The size the customer actually picked, falling back to the product's usual shape.
  const fallback = DEFAULT_TRIM_IN[product];
  // Roll-ups are not sold at the moment, so an unspecified banner falls back to the vinyl shape
  // rather than a 33 x 79in stand nobody can order. The format is still accepted for when they
  // return.
  const trimW = data.trimWidthIn ?? (isRollup ? 33 : fallback.w);
  const trimH = data.trimHeightIn ?? (isRollup ? 79 : fallback.h);

  const target = targetRaster(product, trimW, trimH);
  const shape = shapeOf(trimW, trimH);
  const ratio = ratioLabel(trimW, trimH);

  const baseInfo = {
    businessName: data.businessName,
    tagline: data.tagline,
    phone: data.phone,
    email: data.email,
    website: data.website,
    linkedin: data.linkedin,
    address: data.address,
    palette: resolveAiPalette(data.colorPaletteId),
    includeQrCode: data.includeQrCode,
  };

  /** Lays out one concept's artwork into the product's template. */
  function compose(concept: AiConcept, imageSrc: string) {
    const info = { ...baseInfo, headingFont: concept.headingFont, bodyFont: concept.bodyFont };
    return product === "business-card" ? buildCustomBusinessCard(info, imageSrc, target.w, target.h)
      : product === "postcard" ? buildCustomPostcard(info, imageSrc, target.w, target.h)
      : buildCustomBanner(info, imageSrc, target.w, target.h, data.bannerFormat as BannerFormat);
  }

  const concepts = AI_CONCEPTS.slice(0, CONCEPTS_PER_RUN);

  /*
   * Concepts are generated concurrently.
   *
   * Each image call takes several seconds; run in sequence, four of them is long enough that people
   * assume the page has hung. `allSettled` rather than `all` because one model failure should cost
   * that concept, not the whole set - three good options is a usable answer, and refusing to show
   * any of them because the fourth timed out is not.
   */
  const settled = await Promise.allSettled(concepts.map(async (concept) => {
    const { dataUrl } = await generateImageWithOpenRouter({
      prompt: buildConceptPrompt(concept, data.description, shape, ratio),
    });
    const raw = Buffer.from(dataUrl.split(",")[1] ?? "", "base64");

    // Business cards and postcards are small enough that the model's native output clears the
    // print-DPI floor; banners are physically huge, so the artwork is deliberately upscaled.
    const print = await sharp(raw)
      .resize(target.w, target.h, { fit: "cover", kernel: "lanczos3" })
      .jpeg({ quality: 82 })
      .toBuffer();

    return { concept, print };
  }));

  // Typed via flatMap rather than a predicate: sharp's Buffer is Buffer<ArrayBuffer>, which a
  // hand-written PromiseFulfilledResult<Buffer> predicate does not line up with.
  const produced = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));

  if (produced.length === 0) {
    return NextResponse.json({ error: "generation-failed" }, { status: 502 });
  }

  /*
   * Each concept is stored as a real design so the customer can open any of them in the editor, and
   * so the print-resolution artwork lives server-side rather than in the browser.
   *
   * What goes back over the wire is the watermarked, downscaled preview - see lib/business-card/
   * watermark. The clean version is in the database; the export endpoint releases it once the
   * design has been paid for.
   */
  const results = await Promise.all(produced.map(async ({ concept, print }) => {
    const printSrc = `data:image/jpeg;base64,${print.toString("base64")}`;
    const { front, back } = compose(concept, printSrc);

    const design = await db.cardDesign.create({
      data: {
        userId: identity.userId,
        templateId: null,
        product: PRODUCT_DB_VALUE[product],
        title: `${data.businessName} — ${concept.name}`,
        front,
        back,
        meta: {
          businessName: data.businessName,
          phone: data.phone,
          email: data.email,
          website: data.website,
          linkedin: data.linkedin,
          colorPaletteId: data.colorPaletteId,
          conceptId: concept.id,
        },
      },
    });

    const preview = await buildWatermarkedPreview(print, target.w, target.h);
    const previewSides = compose(concept, preview.dataUrl);

    return {
      designId: design.id,
      conceptId: concept.id,
      name: concept.name,
      blurb: concept.blurb,
      // Watermarked and downscaled. The clean artwork stays on the server.
      front: previewSides.front,
      back: previewSides.back,
    };
  }));

  // One generation, whatever the concept count - the customer asked once, so it costs one credit.
  await db.aiDesignGeneration.create({
    data: { userId: identity.userId, product: PRODUCT_DB_VALUE[product] },
  });

  return NextResponse.json({
    concepts: results,
    remaining: Math.max(0, FREE_AI_DESIGN_LIMIT - used - 1),
    // The first concept, kept under the old keys so an older client still shows something rather
    // than silently rendering nothing.
    designId: results[0].designId,
    front: results[0].front,
    back: results[0].back,
  });
}
