import { NextResponse } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { db } from "@/lib/prisma";
import { safeClerkUserId } from "@/lib/safe-auth";
import { generateImageWithOpenRouter } from "@/lib/openrouter";
import { FREE_AI_DESIGN_LIMIT } from "@/lib/business-card/ai-design-limit";
import { PRODUCT_DB_VALUE, type DesignProduct } from "@/lib/business-card/print-spec";
import { resolveAiPalette } from "@/lib/business-card/templates/ai-palettes";
import { buildCustomBusinessCard, buildCustomPostcard, buildCustomBanner, type BannerFormat } from "@/lib/business-card/templates/ai-custom";

async function resolveIdentity(anonymousToken: string | undefined): Promise<{ userId: string | null; anonymousToken: string | null } | null> {
  const clerkId = await safeClerkUserId();
  if (clerkId) {
    const user = await db.user.findUnique({ where: { clerkId } });
    if (user) return { userId: user.id, anonymousToken: null };
  }
  if (anonymousToken) return { userId: null, anonymousToken };
  return null;
}

async function usageFor(identity: { userId: string | null; anonymousToken: string | null }): Promise<number> {
  return db.aiDesignGeneration.count({
    where: identity.userId ? { userId: identity.userId } : { anonymousToken: identity.anonymousToken },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const anonymousToken = url.searchParams.get("anonymousToken") ?? undefined;
  const identity = await resolveIdentity(anonymousToken);
  if (!identity) return NextResponse.json({ used: 0, limit: FREE_AI_DESIGN_LIMIT, remaining: FREE_AI_DESIGN_LIMIT });

  const used = await usageFor(identity);
  return NextResponse.json({ used, limit: FREE_AI_DESIGN_LIMIT, remaining: Math.max(0, FREE_AI_DESIGN_LIMIT - used) });
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
  anonymousToken: z.string().optional(),
});

const NON_BANNER_TARGET: Record<"business-card" | "postcard", { w: number; h: number }> = {
  "business-card": { w: 1500, h: 900 },
  postcard: { w: 1500, h: 1000 },
};

function buildPrompt(product: DesignProduct, description: string): string {
  const orientation = product === "banner" ? "the aspect ratio given" : "landscape orientation";
  return `Abstract background texture inspired by this business: "${description}". Soft flowing gradient, premium and modern, plenty of smooth open space for text overlay, no text, no logos, no watermark, no border, no frame, no device mockup, full-bleed edge to edge, ${orientation}.`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const identity = await resolveIdentity(data.anonymousToken);
  if (!identity) return NextResponse.json({ error: "Missing identity" }, { status: 400 });

  const used = await usageFor(identity);
  if (used >= FREE_AI_DESIGN_LIMIT) {
    return NextResponse.json({ error: "limit-reached", used, limit: FREE_AI_DESIGN_LIMIT }, { status: 429 });
  }

  const product = data.product;
  const isRollup = product === "banner" && data.bannerFormat === "rollup";

  let dataUrl: string;
  try {
    const result = await generateImageWithOpenRouter({ prompt: buildPrompt(product, data.description) });
    dataUrl = result.dataUrl;
  } catch {
    return NextResponse.json({ error: "generation-failed" }, { status: 502 });
  }

  const raw = Buffer.from(dataUrl.split(",")[1] ?? "", "base64");
  // Business cards/postcards are small enough that the model's native output already clears the
  // print-DPI floor; banners are physically huge (up to 96in wide) so the smooth gradient is
  // deliberately upscaled — see the equivalent step in scripts/generate-template-backgrounds.ts.
  const targetW = product === "banner" ? (isRollup ? 6000 : 16000) : NON_BANNER_TARGET[product].w;
  const targetH = product === "banner" ? (isRollup ? 12000 : 8000) : NON_BANNER_TARGET[product].h;
  const resized = await sharp(raw).resize(targetW, targetH, { fit: "cover", kernel: "lanczos3" }).jpeg({ quality: 82 }).toBuffer();
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
    product === "business-card" ? buildCustomBusinessCard(info, imageSrc, targetW, targetH) :
    product === "postcard" ? buildCustomPostcard(info, imageSrc, targetW, targetH) :
    buildCustomBanner(info, imageSrc, targetW, targetH, data.bannerFormat as BannerFormat);

  const design = await db.cardDesign.create({
    data: {
      userId: identity.userId,
      templateId: null,
      product: PRODUCT_DB_VALUE[product],
      title: data.businessName,
      front,
      back,
      anonymousToken: identity.userId ? null : identity.anonymousToken,
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
    data: { userId: identity.userId, anonymousToken: identity.userId ? null : identity.anonymousToken, product: PRODUCT_DB_VALUE[product] },
  });

  // front/back are returned (not just the id) so the dialog can render an immediate preview of what
  // was actually generated before the user commits to opening the full editor.
  return NextResponse.json({ designId: design.id, remaining: Math.max(0, FREE_AI_DESIGN_LIMIT - used - 1), front, back });
}
