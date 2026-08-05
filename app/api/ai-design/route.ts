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

function buildPrompt(product: DesignProduct, description: string, widthIn: number, heightIn: number): string {
  const shape =
    Math.abs(widthIn - heightIn) / Math.max(widthIn, heightIn) < 0.05
      ? "square"
      : widthIn > heightIn
        ? "landscape"
        : "portrait";
  // Stating the shape and ratio matters: the image is composed for this canvas, and anything the
  // model puts outside it is cropped away rather than scaled to fit.
  return `Abstract background texture inspired by this business: "${description}". Soft flowing gradient, premium and modern, plenty of smooth open space for text overlay, no text, no logos, no watermark, no border, no frame, no device mockup, full-bleed edge to edge, ${shape} orientation, ${ratioLabel(widthIn, heightIn)} aspect ratio.`;
}

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
  const trimW = data.trimWidthIn ?? (isRollup ? 33 : fallback.w);
  const trimH = data.trimHeightIn ?? (isRollup ? 79 : fallback.h);

  let dataUrl: string;
  try {
    const result = await generateImageWithOpenRouter({ prompt: buildPrompt(product, data.description, trimW, trimH) });
    dataUrl = result.dataUrl;
  } catch {
    return NextResponse.json({ error: "generation-failed" }, { status: 502 });
  }

  const raw = Buffer.from(dataUrl.split(",")[1] ?? "", "base64");
  // Business cards/postcards are small enough that the model's native output already clears the
  // print-DPI floor; banners are physically huge (up to 96in wide) so the smooth gradient is
  // deliberately upscaled — see the equivalent step in scripts/generate-template-backgrounds.ts.
  const target = targetRaster(product, trimW, trimH);
  const resized = await sharp(raw)
    .resize(target.w, target.h, { fit: "cover", kernel: "lanczos3" })
    .jpeg({ quality: 82 })
    .toBuffer();
  const imageSrc = `data:image/jpeg;base64,${resized.toString("base64")}`;

  const info = {
    businessName: data.businessName,
    tagline: data.tagline,
    phone: data.phone,
    email: data.email,
    website: data.website,
    linkedin: data.linkedin,
    address: data.address,
    palette: resolveAiPalette(data.colorPaletteId),
    headingFont: "Poppins",
    bodyFont: "Inter",
    includeQrCode: data.includeQrCode,
  };

  const { front, back } =
    product === "business-card" ? buildCustomBusinessCard(info, imageSrc, target.w, target.h) :
    product === "postcard" ? buildCustomPostcard(info, imageSrc, target.w, target.h) :
    buildCustomBanner(info, imageSrc, target.w, target.h, data.bannerFormat as BannerFormat);

  const design = await db.cardDesign.create({
    data: {
      userId: identity.userId,
      templateId: null,
      product: PRODUCT_DB_VALUE[product],
      title: data.businessName,
      front,
      back,
      meta: {
        businessName: data.businessName,
        phone: data.phone,
        email: data.email,
        website: data.website,
        linkedin: data.linkedin,
        colorPaletteId: data.colorPaletteId,
      },
    },
  });

  await db.aiDesignGeneration.create({
    data: { userId: identity.userId, product: PRODUCT_DB_VALUE[product] },
  });

  // front/back are returned (not just the id) so the dialog can render an immediate preview of what
  // was actually generated before the user commits to opening the full editor.
  return NextResponse.json({ designId: design.id, remaining: Math.max(0, FREE_AI_DESIGN_LIMIT - used - 1), front, back });
}
