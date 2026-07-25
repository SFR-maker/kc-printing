import type { CardSide, TextElement, ShapeElement, ImageElement } from "../schema";
import type { CategoryContent } from "./categories";
import { contrastRatio } from "../validate";

function readableInk(candidate: string): string {
  return contrastRatio(candidate, "#FFFFFF") >= 4.5 ? candidate : "#161616";
}

let counter = 0;
function id(prefix: string): string {
  counter += 1;
  return `pc-${prefix}-${counter}`;
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

// Canonical postcard size for generated templates — the customer's chosen size at order time is a
// separate print-spec concern; the editor lets them resize/re-lay-out after picking a template.
const W = 6;
const H = 4;

function side(background: CardSide["background"], elements: CardSide["elements"]): CardSide {
  return { physicalWidthIn: W, physicalHeightIn: H, bleedIn: 0.125, safeZoneInsetIn: 0.125, background, elements };
}

function solidSide(color: string, elements: CardSide["elements"]): CardSide {
  return side({ type: "solid", color, gradient: null }, elements);
}

/** A generic mailing-panel back: return address block top-left, a ruled divider, and an open area
 * on the right reserved for the recipient address / postage — standard postcard back convention. */
function mailingBack(ctx: CategoryContent, accent: string, ink: string): CardSide {
  return solidSide("#FFFFFF", [
    text({ x: 0.35, y: 0.35, width: 2.6, height: 0.22, text: ctx.company, fontFamily: ctx.headingFont, fontSizePt: 10, fontWeight: "700", color: ink }),
    text({ x: 0.35, y: 0.6, width: 2.6, height: 0.18, text: ctx.address, fontFamily: ctx.bodyFont, fontSizePt: 7, color: "#555555" }),
    text({ x: 0.35, y: 0.8, width: 2.6, height: 0.18, text: `${ctx.phone}  ·  ${ctx.website}`, fontFamily: ctx.bodyFont, fontSizePt: 7, color: "#555555" }),
    shape({ x: W / 2, y: 0.3, width: 0.01, height: H - 0.6, shape: "divider", fill: "#E5E5E5" }),
    shape({ x: W - 1.3, y: 0.3, width: 1, height: 1, shape: "rect", fill: null, stroke: accent, strokeWidthPx: 1.5, cornerRadiusIn: 0.04 }),
    text({ x: W - 1.3, y: 0.62, width: 1, height: 0.18, text: "STAMP", fontFamily: "Inter", fontSizePt: 7, color: accent, align: "center", letterSpacing: 1 }),
  ]);
}

export type PostcardArchetype = (ctx: CategoryContent) => { front: CardSide; back: CardSide };

/** 1. Bold full-bleed color background, big headline, company name, CTA line. */
export const boldHeadline: PostcardArchetype = (ctx) => {
  const [p, s, inkRaw] = ctx.palette;
  const ink = readableInk(inkRaw);
  const front = solidSide(p, [
    text({ x: 0.4, y: 0.5, width: W - 0.8, height: 0.9, text: "Now Booking", fontFamily: ctx.headingFont, fontSizePt: 34, fontWeight: "800", color: "#FFFFFF" }),
    text({ x: 0.4, y: 1.5, width: W - 0.8, height: 0.4, text: ctx.company, fontFamily: ctx.bodyFont, fontSizePt: 16, fontWeight: "600", color: s }),
    shape({ x: 0.4, y: H - 0.75, width: 2.2, height: 0.45, shape: "rect", fill: "#FFFFFF", cornerRadiusIn: 0.06 }),
    text({ x: 0.4, y: H - 0.63, width: 2.2, height: 0.25, text: `Call ${ctx.phone}`, fontFamily: ctx.bodyFont, fontSizePt: 10, fontWeight: "700", color: p, align: "center" }),
  ]);
  return { front, back: mailingBack(ctx, p, ink) };
};

/** 2. Split layout — left color accent panel with company/headline, right white space for a photo. */
export const photoHighlight: PostcardArchetype = (ctx) => {
  const [p, , inkRaw] = ctx.palette;
  const ink = readableInk(inkRaw);
  const front = solidSide("#FFFFFF", [
    shape({ x: 0, y: 0, width: 2.4, height: H, shape: "rect", fill: p }),
    text({ x: 0.3, y: 0.5, width: 1.9, height: 0.6, text: "Special Offer", fontFamily: ctx.headingFont, fontSizePt: 20, fontWeight: "800", color: "#FFFFFF" }),
    text({ x: 0.3, y: 1.2, width: 1.9, height: 0.4, text: ctx.company, fontFamily: ctx.bodyFont, fontSizePt: 11, fontWeight: "600", color: "#FFFFFF" }),
    text({ x: 0.3, y: H - 0.6, width: 1.9, height: 0.2, text: ctx.phone, fontFamily: ctx.bodyFont, fontSizePt: 9, color: "#FFFFFF" }),
    text({ x: 0.3, y: H - 0.38, width: 1.9, height: 0.2, text: ctx.website, fontFamily: ctx.bodyFont, fontSizePt: 9, color: "#FFFFFF" }),
    shape({ x: 2.7, y: 0.4, width: W - 3.1, height: H - 0.8, shape: "rect", fill: null, stroke: "#D1D5DB", strokeWidthPx: 1, cornerRadiusIn: 0.05 }),
    text({ x: 2.9, y: H / 2 - 0.1, width: W - 3.5, height: 0.2, text: "Photo goes here", fontFamily: "Inter", fontSizePt: 9, color: "#9CA3AF", align: "center" }),
  ]);
  return { front, back: mailingBack(ctx, p, ink) };
};

/** 3. Clean, centered announcement on white — accent rule, generous margins. */
export const cleanAnnouncement: PostcardArchetype = (ctx) => {
  const [p, , inkRaw] = ctx.palette;
  const ink = readableInk(inkRaw);
  const front = solidSide("#FFFFFF", [
    text({ x: 0.4, y: 0.45, width: W - 0.8, height: 0.25, text: ctx.company.toUpperCase(), fontFamily: ctx.bodyFont, fontSizePt: 10, fontWeight: "600", color: p, align: "center", letterSpacing: 2 }),
    shape({ x: W / 2 - 0.35, y: 0.85, width: 0.7, height: 0.02, shape: "divider", fill: p }),
    text({ x: 0.4, y: 1.1, width: W - 0.8, height: 0.9, text: "You're Invited", fontFamily: ctx.headingFont, fontSizePt: 30, fontWeight: "800", color: ink, align: "center" }),
    text({ x: 0.4, y: H - 0.7, width: W - 0.8, height: 0.3, text: `${ctx.phone}   •   ${ctx.website}`, fontFamily: ctx.bodyFont, fontSizePt: 9, color: "#555555", align: "center" }),
  ]);
  return { front, back: mailingBack(ctx, p, ink) };
};

/** 4. Bottom accent band — headline up top, solid color band with contact info along the bottom. */
export const bottomBand: PostcardArchetype = (ctx) => {
  const [p, s, inkRaw] = ctx.palette;
  const ink = readableInk(inkRaw);
  const front = solidSide("#FFFFFF", [
    text({ x: 0.4, y: 0.4, width: W - 0.8, height: 0.3, text: ctx.company, fontFamily: ctx.bodyFont, fontSizePt: 12, fontWeight: "600", color: p }),
    text({ x: 0.4, y: 0.8, width: W - 0.8, height: 0.85, text: "Grand Opening", fontFamily: ctx.headingFont, fontSizePt: 28, fontWeight: "800", color: ink }),
    shape({ x: 0, y: H - 0.85, width: W, height: 0.85, shape: "rect", fill: p }),
    text({ x: 0.4, y: H - 0.62, width: W - 0.8, height: 0.22, text: ctx.address, fontFamily: ctx.bodyFont, fontSizePt: 9, color: "#FFFFFF" }),
    text({ x: 0.4, y: H - 0.38, width: W - 0.8, height: 0.22, text: `${ctx.phone}  ·  ${ctx.website}`, fontFamily: ctx.bodyFont, fontSizePt: 9, color: s }),
  ]);
  return { front, back: mailingBack(ctx, p, ink) };
};

/** 5. AI-generated background texture (warm coral/cream), light glass panel holding the headline. */
export const aiTextureWarm: PostcardArchetype = (ctx) => {
  const [p, , inkRaw] = ctx.palette;
  const ink = readableInk(inkRaw);
  const front = side({ type: "solid", color: "#FFFFFF", gradient: null }, [
    bgImage("/images/templates/postcard-texture-1.jpg", 1500, 1000, W, H),
    shape({ x: 2.5, y: 0.7, width: 3.15, height: 2.6, shape: "rect", fill: "#FFFFFF", opacity: 0.86, cornerRadiusIn: 0.1 }),
    text({ x: 2.75, y: 0.95, width: 2.65, height: 0.7, text: "Now Booking", fontFamily: ctx.headingFont, fontSizePt: 30, fontWeight: "800", color: ink }),
    text({ x: 2.75, y: 1.65, width: 2.65, height: 0.35, text: ctx.company, fontFamily: ctx.bodyFont, fontSizePt: 14, fontWeight: "600", color: p }),
    shape({ x: 2.75, y: 2.15, width: 2.2, height: 0.45, shape: "rect", fill: p, cornerRadiusIn: 0.06 }),
    text({ x: 2.75, y: 2.28, width: 2.2, height: 0.25, text: `Call ${ctx.phone}`, fontFamily: ctx.bodyFont, fontSizePt: 10, fontWeight: "700", color: "#FFFFFF", align: "center" }),
  ]);
  return { front, back: mailingBack(ctx, p, ink) };
};

/** 6. AI-generated background texture (deep teal/violet), dark glass panel top-left for the headline. */
export const aiTextureBold: PostcardArchetype = (ctx) => {
  const [p, s] = ctx.palette;
  const front = side({ type: "solid", color: "#FFFFFF", gradient: null }, [
    bgImage("/images/templates/postcard-texture-2.jpg", 1500, 1000, W, H),
    shape({ x: 0.35, y: 0.35, width: 3.6, height: 1.9, shape: "rect", fill: "#0B0B14", opacity: 0.45, cornerRadiusIn: 0.1 }),
    text({ x: 0.6, y: 0.55, width: 3.1, height: 0.8, text: "Grand Opening", fontFamily: ctx.headingFont, fontSizePt: 26, fontWeight: "800", color: "#FFFFFF" }),
    text({ x: 0.6, y: 1.3, width: 3.1, height: 0.35, text: ctx.company, fontFamily: ctx.bodyFont, fontSizePt: 13, fontWeight: "600", color: "#FFFFFF" }),
    text({ x: 0.6, y: 1.65, width: 3.1, height: 0.3, text: `${ctx.phone}  ·  ${ctx.website}`, fontFamily: ctx.bodyFont, fontSizePt: 10, color: s }),
  ]);
  return { front, back: mailingBack(ctx, p, readableInk(p)) };
};

export const POSTCARD_ARCHETYPES: { name: string; style: string; fn: PostcardArchetype }[] = [
  { name: "bold-headline", style: "bold", fn: boldHeadline },
  { name: "photo-highlight", style: "creative", fn: photoHighlight },
  { name: "clean-announcement", style: "minimal", fn: cleanAnnouncement },
  { name: "bottom-band", style: "modern", fn: bottomBand },
  { name: "ai-texture-warm", style: "friendly", fn: aiTextureWarm },
  { name: "ai-texture-bold", style: "luxury", fn: aiTextureBold },
];
