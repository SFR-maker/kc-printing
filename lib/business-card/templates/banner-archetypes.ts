import type { CardSide, TextElement, ShapeElement, ImageElement } from "../schema";
import type { CategoryContent } from "./categories";
import { contrastRatio } from "../validate";

function readableInk(candidate: string): string {
  return contrastRatio(candidate, "#FFFFFF") >= 4.5 ? candidate : "#161616";
}

let counter = 0;
function id(prefix: string): string {
  counter += 1;
  return `bn-${prefix}-${counter}`;
}

function text(partial: Partial<TextElement> & Pick<TextElement, "x" | "y" | "width" | "height" | "text">): TextElement {
  return {
    id: id("text"), type: "text", rotation: 0, zIndex: 1, opacity: 1, locked: false, visible: true,
    fontFamily: "Inter", fontSizePt: 12, fontWeight: "400", italic: false, underline: false,
    textTransform: "none", align: "left", lineHeight: 1.15, letterSpacing: 0, color: "#111111", backgroundColor: null,
    ...partial,
  };
}

function shape(partial: Partial<ShapeElement> & Pick<ShapeElement, "x" | "y" | "width" | "height" | "shape">): ShapeElement {
  return {
    id: id("shape"), type: "shape", rotation: 0, zIndex: 0, opacity: 1, locked: false, visible: true,
    fill: "#000000", stroke: null, strokeWidthPx: 0, cornerRadiusIn: 0, gradient: null,
    ...partial,
  };
}

/** Full-bleed AI-generated background image, locked and sent behind everything else. */
function bgImage(src: string, naturalWidthPx: number, naturalHeightPx: number, w: number, h: number): ImageElement {
  return {
    id: id("bg"), type: "image", x: 0, y: 0, width: w, height: h, rotation: 0, zIndex: -1,
    opacity: 1, locked: true, visible: true, src, naturalWidthPx, naturalHeightPx,
    crop: null, borderWidthPx: 0, borderColor: "#000000", cornerRadiusIn: 0,
  };
}

// Canonical sizes used for generated templates. Roll-up stands are tall and narrow (viewed close
// up, walking past); vinyl banners are wide (viewed from a distance) — very different compositions.
const ROLLUP_W = 33;
const ROLLUP_H = 81;
const VINYL_W = 96;
const VINYL_H = 48;

function rollupSide(background: CardSide["background"], elements: CardSide["elements"]): CardSide {
  return { physicalWidthIn: ROLLUP_W, physicalHeightIn: ROLLUP_H, bleedIn: 0.125, safeZoneInsetIn: 0.5, shapeMask: "rectangle", background, elements };
}

function vinylSide(background: CardSide["background"], elements: CardSide["elements"]): CardSide {
  return { physicalWidthIn: VINYL_W, physicalHeightIn: VINYL_H, bleedIn: 0.125, safeZoneInsetIn: 0.25, shapeMask: "rectangle", background, elements };
}

// Banners don't have a meaningful "back" (only one side prints) — the schema always needs one, so
// back mirrors front at a small scale as a design reference rather than a second printed side.
function blankBack(w: number, h: number): CardSide {
  return { physicalWidthIn: w, physicalHeightIn: h, bleedIn: 0.125, safeZoneInsetIn: 0.25, shapeMask: "rectangle", background: { type: "solid", color: "#FFFFFF", gradient: null }, elements: [] };
}

export type BannerArchetype = (ctx: CategoryContent) => { front: CardSide; back: CardSide };

/** 1. Roll-up stand — full-bleed color, huge stacked headline top-down, logo mark and contact
 * pinned near the bottom third where it stays visible above a podium or table at a trade show.
 * Font sizes here are print points at real banner scale (33 x 81in) — a "huge" headline needs to
 * be 150pt+ (2in+ tall) to actually read as bold from across a room, not the ~15pt that would look
 * bold on a business card. */
export const rollupBold: BannerArchetype = (ctx) => {
  const [p, s, inkRaw] = ctx.palette;
  void readableInk(inkRaw);
  const front = rollupSide({ type: "solid", color: p, gradient: null }, [
    shape({ x: ROLLUP_W / 2 - 2, y: 5, width: 4, height: 4, shape: "rect", fill: null, stroke: "#FFFFFF", strokeWidthPx: 4, cornerRadiusIn: 0.2 }),
    text({ x: ROLLUP_W / 2 - 2, y: 6.6, width: 4, height: 1, text: "LOGO", fontFamily: "Inter", fontSizePt: 30, color: "#FFFFFF", align: "center", letterSpacing: 2 }),
    text({ x: 2, y: 26, width: ROLLUP_W - 4, height: 16, text: ctx.company, fontFamily: ctx.headingFont, fontSizePt: 170, fontWeight: "800", color: "#FFFFFF", align: "center", lineHeight: 1.05 }),
    text({ x: 2, y: 44, width: ROLLUP_W - 4, height: 4, text: ctx.title, fontFamily: ctx.bodyFont, fontSizePt: 48, color: s, align: "center" }),
    shape({ x: 0, y: ROLLUP_H - 14, width: ROLLUP_W, height: 14, shape: "rect", fill: "#000000", opacity: 0.2 }),
    text({ x: 2, y: ROLLUP_H - 11.5, width: ROLLUP_W - 4, height: 3, text: ctx.phone, fontFamily: ctx.bodyFont, fontSizePt: 32, color: "#FFFFFF", align: "center" }),
    text({ x: 2, y: ROLLUP_H - 6.5, width: ROLLUP_W - 4, height: 3, text: ctx.website, fontFamily: ctx.bodyFont, fontSizePt: 32, color: "#FFFFFF", align: "center" }),
  ]);
  return { front, back: blankBack(ROLLUP_W, ROLLUP_H) };
};

/** 2. Roll-up stand — white background, bold color block at the top with company, minimal below. */
export const rollupTopBlock: BannerArchetype = (ctx) => {
  const [p, , inkRaw] = ctx.palette;
  const ink = readableInk(inkRaw);
  const front = rollupSide({ type: "solid", color: "#FFFFFF", gradient: null }, [
    shape({ x: 0, y: 0, width: ROLLUP_W, height: 24, shape: "rect", fill: p }),
    text({ x: 2, y: 9, width: ROLLUP_W - 4, height: 10, text: ctx.company, fontFamily: ctx.headingFont, fontSizePt: 120, fontWeight: "800", color: "#FFFFFF", align: "center", lineHeight: 1.1 }),
    text({ x: 2, y: 34, width: ROLLUP_W - 4, height: 4, text: ctx.title, fontFamily: ctx.bodyFont, fontSizePt: 46, fontWeight: "600", color: ink, align: "center" }),
    shape({ x: ROLLUP_W / 2 - 6, y: 56, width: 12, height: 0.15, shape: "divider", fill: p }),
    text({ x: 2, y: 61, width: ROLLUP_W - 4, height: 3, text: ctx.phone, fontFamily: ctx.bodyFont, fontSizePt: 30, color: "#444444", align: "center" }),
    text({ x: 2, y: 66, width: ROLLUP_W - 4, height: 3, text: ctx.website, fontFamily: ctx.bodyFont, fontSizePt: 30, color: p, align: "center" }),
    text({ x: 2, y: 71, width: ROLLUP_W - 4, height: 3, text: ctx.address, fontFamily: ctx.bodyFont, fontSizePt: 24, color: "#666666", align: "center" }),
  ]);
  return { front, back: blankBack(ROLLUP_W, ROLLUP_H) };
};

/** 3. Vinyl banner — wide, single bold message readable from across a parking lot. */
export const vinylBold: BannerArchetype = (ctx) => {
  const [p, s] = ctx.palette;
  const front = vinylSide({ type: "solid", color: p, gradient: null }, [
    text({ x: 3, y: 8, width: VINYL_W - 6, height: 12, text: "Grand Opening", fontFamily: ctx.headingFont, fontSizePt: 500, fontWeight: "800", color: "#FFFFFF", align: "center", lineHeight: 1 }),
    text({ x: 3, y: 27, width: VINYL_W - 6, height: 8, text: ctx.company, fontFamily: ctx.bodyFont, fontSizePt: 130, fontWeight: "600", color: s, align: "center" }),
    text({ x: 3, y: 39, width: VINYL_W - 6, height: 6, text: `${ctx.phone}   •   ${ctx.website}`, fontFamily: ctx.bodyFont, fontSizePt: 60, color: "#FFFFFF", align: "center" }),
  ]);
  return { front, back: blankBack(VINYL_W, VINYL_H) };
};

/** 4. Vinyl banner — split layout, color panel on one side with company name, message on the other. */
export const vinylSplit: BannerArchetype = (ctx) => {
  const [p, , inkRaw] = ctx.palette;
  const ink = readableInk(inkRaw);
  const front = vinylSide({ type: "solid", color: "#FFFFFF", gradient: null }, [
    shape({ x: 0, y: 0, width: VINYL_W * 0.32, height: VINYL_H, shape: "rect", fill: p }),
    text({ x: 2, y: VINYL_H / 2 - 8, width: VINYL_W * 0.32 - 4, height: 16, text: ctx.company, fontFamily: ctx.headingFont, fontSizePt: 130, fontWeight: "800", color: "#FFFFFF", lineHeight: 1.1 }),
    text({ x: VINYL_W * 0.36, y: 8, width: VINYL_W * 0.6, height: 24, text: "Now Serving Your Neighborhood", fontFamily: ctx.headingFont, fontSizePt: 230, fontWeight: "800", color: ink, lineHeight: 1.15 }),
    text({ x: VINYL_W * 0.36, y: 38, width: VINYL_W * 0.6, height: 6, text: `${ctx.phone}   •   ${ctx.website}`, fontFamily: ctx.bodyFont, fontSizePt: 55, color: "#444444" }),
  ]);
  return { front, back: blankBack(VINYL_W, VINYL_H) };
};

/** 5. Roll-up stand — AI-generated vertical gradient background, dark glass panel behind the
 * headline so it stays readable regardless of exactly where the gradient falls light or dark. */
export const aiTextureRollup: BannerArchetype = (ctx) => {
  const [, s] = ctx.palette;
  const front = rollupSide({ type: "solid", color: "#FFFFFF", gradient: null }, [
    bgImage("/images/templates/banner-texture-1.jpg", 6000, 12000, ROLLUP_W, ROLLUP_H),
    shape({ x: ROLLUP_W / 2 - 2, y: 5, width: 4, height: 4, shape: "rect", fill: null, stroke: "#FFFFFF", strokeWidthPx: 4, cornerRadiusIn: 0.2 }),
    text({ x: ROLLUP_W / 2 - 2, y: 6.6, width: 4, height: 1, text: "LOGO", fontFamily: "Inter", fontSizePt: 30, color: "#FFFFFF", align: "center", letterSpacing: 2 }),
    shape({ x: 1, y: 24, width: ROLLUP_W - 2, height: 22, shape: "rect", fill: "#000000", opacity: 0.32, cornerRadiusIn: 0.4 }),
    text({ x: 2, y: 27, width: ROLLUP_W - 4, height: 12, text: ctx.company, fontFamily: ctx.headingFont, fontSizePt: 150, fontWeight: "800", color: "#FFFFFF", align: "center", lineHeight: 1.05 }),
    text({ x: 2, y: 42, width: ROLLUP_W - 4, height: 4, text: ctx.title, fontFamily: ctx.bodyFont, fontSizePt: 44, color: s, align: "center" }),
    shape({ x: 0, y: ROLLUP_H - 14, width: ROLLUP_W, height: 14, shape: "rect", fill: "#000000", opacity: 0.4 }),
    text({ x: 2, y: ROLLUP_H - 11.5, width: ROLLUP_W - 4, height: 3, text: ctx.phone, fontFamily: ctx.bodyFont, fontSizePt: 32, color: "#FFFFFF", align: "center" }),
    text({ x: 2, y: ROLLUP_H - 6.5, width: ROLLUP_W - 4, height: 3, text: ctx.website, fontFamily: ctx.bodyFont, fontSizePt: 32, color: "#FFFFFF", align: "center" }),
  ]);
  return { front, back: blankBack(ROLLUP_W, ROLLUP_H) };
};

/** 6. Vinyl banner — AI-generated wide gradient background, dark glass panel behind the headline. */
export const aiTextureVinyl: BannerArchetype = (ctx) => {
  const [, s] = ctx.palette;
  const front = vinylSide({ type: "solid", color: "#FFFFFF", gradient: null }, [
    bgImage("/images/templates/banner-texture-2.jpg", 16000, 8000, VINYL_W, VINYL_H),
    shape({ x: 2, y: 5, width: VINYL_W - 4, height: 38, shape: "rect", fill: "#000000", opacity: 0.32, cornerRadiusIn: 1 }),
    text({ x: 3, y: 9, width: VINYL_W - 6, height: 12, text: "Grand Opening", fontFamily: ctx.headingFont, fontSizePt: 480, fontWeight: "800", color: "#FFFFFF", align: "center", lineHeight: 1 }),
    text({ x: 3, y: 27, width: VINYL_W - 6, height: 8, text: ctx.company, fontFamily: ctx.bodyFont, fontSizePt: 120, fontWeight: "600", color: s, align: "center" }),
    text({ x: 3, y: 38, width: VINYL_W - 6, height: 6, text: `${ctx.phone}   •   ${ctx.website}`, fontFamily: ctx.bodyFont, fontSizePt: 58, color: "#FFFFFF", align: "center" }),
  ]);
  return { front, back: blankBack(VINYL_W, VINYL_H) };
};

/** 7. Roll-up stand — AI-generated navy skyline texture, badge-style logo mark, corporate/civic mood. */
export const aiTextureCorporateRollup: BannerArchetype = (ctx) => {
  const [, s] = ctx.palette;
  const front = rollupSide({ type: "solid", color: "#FFFFFF", gradient: null }, [
    bgImage("/images/templates/banner-texture-3.jpg", 900, 1800, ROLLUP_W, ROLLUP_H),
    shape({ x: ROLLUP_W / 2 - 2.2, y: 5, width: 4.4, height: 4.4, shape: "rect", fill: null, stroke: "#FFFFFF", strokeWidthPx: 3, cornerRadiusIn: 2.2 }),
    text({ x: ROLLUP_W / 2 - 2.2, y: 6.7, width: 4.4, height: 1, text: "LOGO", fontFamily: "Inter", fontSizePt: 30, color: "#FFFFFF", align: "center", letterSpacing: 2 }),
    text({ x: 2, y: 22, width: ROLLUP_W - 4, height: 12, text: ctx.company, fontFamily: ctx.headingFont, fontSizePt: 130, fontWeight: "800", color: "#FFFFFF", align: "center", lineHeight: 1.08 }),
    text({ x: 2, y: 36, width: ROLLUP_W - 4, height: 4, text: ctx.title, fontFamily: ctx.bodyFont, fontSizePt: 42, color: s, align: "center" }),
    shape({ x: ROLLUP_W / 2 - 4, y: 41, width: 8, height: 0.1, shape: "divider", fill: "#FFFFFF" }),
    shape({ x: 0, y: ROLLUP_H - 14, width: ROLLUP_W, height: 14, shape: "rect", fill: "#000000", opacity: 0.35 }),
    text({ x: 2, y: ROLLUP_H - 11.5, width: ROLLUP_W - 4, height: 3, text: ctx.phone, fontFamily: ctx.bodyFont, fontSizePt: 32, color: "#FFFFFF", align: "center" }),
    text({ x: 2, y: ROLLUP_H - 6.5, width: ROLLUP_W - 4, height: 3, text: ctx.website, fontFamily: ctx.bodyFont, fontSizePt: 32, color: "#FFFFFF", align: "center" }),
  ]);
  return { front, back: blankBack(ROLLUP_W, ROLLUP_H) };
};

/** 8. Vinyl banner — AI-generated navy skyline texture, badge-style logo mark, corporate/civic mood. */
export const aiTextureCorporateVinyl: BannerArchetype = (ctx) => {
  const [, s] = ctx.palette;
  const front = vinylSide({ type: "solid", color: "#FFFFFF", gradient: null }, [
    bgImage("/images/templates/banner-texture-4.jpg", 1800, 900, VINYL_W, VINYL_H),
    shape({ x: 3, y: 4, width: 9, height: 9, shape: "rect", fill: null, stroke: "#FFFFFF", strokeWidthPx: 3, cornerRadiusIn: 4.5 }),
    text({ x: 3, y: 6.7, width: 9, height: 3.5, text: "LOGO", fontFamily: "Inter", fontSizePt: 40, color: "#FFFFFF", align: "center", letterSpacing: 2 }),
    text({ x: 15, y: 8, width: VINYL_W - 30, height: 12, text: ctx.company, fontFamily: ctx.headingFont, fontSizePt: 190, fontWeight: "800", color: "#FFFFFF", align: "center", lineHeight: 1.05 }),
    text({ x: 15, y: 26, width: VINYL_W - 30, height: 6, text: ctx.title, fontFamily: ctx.bodyFont, fontSizePt: 62, color: s, align: "center" }),
    text({ x: 15, y: 36, width: VINYL_W - 30, height: 6, text: `${ctx.phone}   •   ${ctx.website}`, fontFamily: ctx.bodyFont, fontSizePt: 55, color: "#FFFFFF", align: "center" }),
  ]);
  return { front, back: blankBack(VINYL_W, VINYL_H) };
};

export const BANNER_ARCHETYPES: { name: string; style: string; fn: BannerArchetype }[] = [
  { name: "rollup-bold", style: "bold", fn: rollupBold },
  { name: "rollup-top-block", style: "corporate", fn: rollupTopBlock },
  { name: "vinyl-bold", style: "bold", fn: vinylBold },
  { name: "vinyl-split", style: "modern", fn: vinylSplit },
  { name: "ai-texture-rollup", style: "luxury", fn: aiTextureRollup },
  { name: "ai-texture-vinyl", style: "elegant", fn: aiTextureVinyl },
  { name: "ai-texture-corporate-rollup", style: "corporate", fn: aiTextureCorporateRollup },
  { name: "ai-texture-corporate-vinyl", style: "corporate", fn: aiTextureCorporateVinyl },
];
