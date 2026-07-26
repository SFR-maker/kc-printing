import type { CardSide, TextElement, ShapeElement, ImageElement } from "../schema";
import type { CategoryContent } from "./categories";
import { contrastRatio } from "../validate";

function readableInk(candidate: string): string {
  return contrastRatio(candidate, "#FFFFFF") >= 4.5 ? candidate : "#161616";
}

let counter = 0;
function id(prefix: string): string {
  counter += 1;
  return `ai-${prefix}-${counter}`;
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

function bgImage(src: string, naturalWidthPx: number, naturalHeightPx: number, w: number, h: number): ImageElement {
  return {
    id: id("bg"), type: "image", x: 0, y: 0, width: w, height: h, rotation: 0, zIndex: -1,
    opacity: 1, locked: true, visible: true, src, naturalWidthPx, naturalHeightPx,
    crop: null, borderWidthPx: 0, borderColor: "#000000", cornerRadiusIn: 0,
  };
}

const W = 3.75;
const H = 2.25;

function side(background: CardSide["background"], elements: CardSide["elements"]): CardSide {
  return { physicalWidthIn: W, physicalHeightIn: H, bleedIn: 0.125, safeZoneInsetIn: 0.125, background, elements };
}

function solidSide(color: string, elements: CardSide["elements"]): CardSide {
  return side({ type: "solid", color, gradient: null }, elements);
}

function contactBlock(ctx: CategoryContent, x: number, y: number, width: number, color: string): TextElement[] {
  const lines = [ctx.phone, ctx.email, ctx.website];
  return lines.map((line, i) =>
    text({ x, y: y + i * 0.19, width, height: 0.18, text: line, fontFamily: ctx.bodyFont, fontSizePt: 7, color })
  );
}

export type AiArchetype = (ctx: CategoryContent) => { front: CardSide; back: CardSide };

/** 1. AI-generated watercolor texture background, light glass panel bottom-left holding the name block. */
export const aiTextureElegant: AiArchetype = (ctx) => {
  const [p, , inkRaw] = ctx.palette;
  const ink = readableInk(inkRaw);
  const front = solidSide("#FFFFFF", [
    bgImage("/images/templates/business-card-texture-1.jpg", 1500, 900, W, H),
    shape({ x: 0.22, y: 0.68, width: 2.35, height: 1.32, shape: "rect", fill: "#FFFFFF", opacity: 0.85, cornerRadiusIn: 0.08 }),
    text({ x: 0.4, y: 0.85, width: 2.0, height: 0.3, text: ctx.name, fontFamily: ctx.headingFont, fontSizePt: 14, fontWeight: "700", color: ink }),
    text({ x: 0.4, y: 1.12, width: 2.0, height: 0.2, text: ctx.title, fontFamily: ctx.bodyFont, fontSizePt: 8.5, color: p }),
    ...contactBlock(ctx, 0.4, 1.37, 2.0, "#333333"),
  ]);
  const back = solidSide(p, [
    bgImage("/images/templates/business-card-texture-1.jpg", 1500, 900, W, H),
    shape({ x: 0, y: 0, width: W, height: H, shape: "rect", fill: p, opacity: 0.72 }),
    text({ x: 0.3, y: 0.9, width: W - 0.6, height: 0.35, text: ctx.company, fontFamily: ctx.headingFont, fontSizePt: 16, fontWeight: "700", color: "#FFFFFF", align: "center" }),
  ]);
  return { front, back };
};

/** 2. AI-generated charcoal/gold geometric texture, dark side already reads well — white text direct. */
export const aiTextureLuxury: AiArchetype = (ctx) => {
  const [, s] = ctx.palette;
  const front = solidSide("#111111", [
    bgImage("/images/templates/business-card-texture-2.jpg", 1500, 900, W, H),
    text({ x: 0.32, y: 0.42, width: 2.5, height: 0.3, text: ctx.name, fontFamily: ctx.headingFont, fontSizePt: 15, fontWeight: "700", color: "#FFFFFF" }),
    text({ x: 0.32, y: 0.7, width: 2.5, height: 0.2, text: ctx.title, fontFamily: ctx.bodyFont, fontSizePt: 8.5, color: "#D8CAA8" }),
    shape({ x: 0.32, y: 0.98, width: 0.5, height: 0.015, shape: "divider", fill: "#D8CAA8" }),
    ...contactBlock(ctx, 0.32, 1.14, 2.5, "#F0F0F0"),
  ]);
  const back = solidSide("#111111", [
    bgImage("/images/templates/business-card-texture-2.jpg", 1500, 900, W, H),
    shape({ x: 0, y: 0, width: W, height: H, shape: "rect", fill: "#000000", opacity: 0.45 }),
    text({ x: 0.3, y: 0.9, width: W - 0.6, height: 0.35, text: ctx.company, fontFamily: ctx.headingFont, fontSizePt: 15, fontWeight: "700", color: "#FFFFFF", align: "center" }),
    text({ x: 0.3, y: 1.22, width: W - 0.6, height: 0.2, text: ctx.website, fontFamily: ctx.bodyFont, fontSizePt: 8, color: s, align: "center" }),
  ]);
  return { front, back };
};

/** 3. AI-generated botanical watercolor + line-art texture, centered name block on open cream space. */
export const aiTextureBotanical: AiArchetype = (ctx) => {
  const [p, , inkRaw] = ctx.palette;
  const ink = readableInk(inkRaw);
  const front = solidSide("#FFFFFF", [
    bgImage("/images/templates/business-card-texture-3.jpg", 1500, 900, W, H),
    shape({ x: 0.35, y: 0.55, width: 2.6, height: 1.15, shape: "rect", fill: "#FFFFFF", opacity: 0.55, cornerRadiusIn: 0.06 }),
    text({ x: 0.5, y: 0.68, width: 2.3, height: 0.3, text: ctx.name, fontFamily: ctx.headingFont, fontSizePt: 14, fontWeight: "700", color: ink }),
    text({ x: 0.5, y: 0.95, width: 2.3, height: 0.2, text: ctx.title, fontFamily: ctx.bodyFont, fontSizePt: 8.5, color: p }),
    ...contactBlock(ctx, 0.5, 1.22, 2.3, "#333333"),
  ]);
  const back = solidSide("#F7F5F0", [
    bgImage("/images/templates/business-card-texture-3.jpg", 1500, 900, W, H),
    shape({ x: 0, y: 0, width: W, height: H, shape: "rect", fill: "#FFFFFF", opacity: 0.5 }),
    text({ x: 0.3, y: 0.9, width: W - 0.6, height: 0.35, text: ctx.company, fontFamily: ctx.headingFont, fontSizePt: 16, fontWeight: "700", color: ink, align: "center" }),
  ]);
  return { front, back };
};

/** 4. AI-generated bold black-and-white paintbrush texture, clean open right side for the name block. */
export const aiTexturePaintbrush: AiArchetype = (ctx) => {
  const [p, s] = ctx.palette;
  const front = solidSide("#FFFFFF", [
    bgImage("/images/templates/business-card-texture-4.jpg", 1500, 900, W, H),
    text({ x: 2.05, y: 0.55, width: 1.55, height: 0.3, text: ctx.name, fontFamily: ctx.headingFont, fontSizePt: 13, fontWeight: "700", color: "#111111" }),
    text({ x: 2.05, y: 0.81, width: 1.55, height: 0.2, text: ctx.title, fontFamily: ctx.bodyFont, fontSizePt: 8, color: p }),
    shape({ x: 2.05, y: 1.05, width: 0.4, height: 0.015, shape: "divider", fill: s }),
    ...contactBlock(ctx, 2.05, 1.2, 1.55, "#333333"),
  ]);
  const back = solidSide("#111111", [
    text({ x: 0.3, y: 0.9, width: W - 0.6, height: 0.35, text: ctx.company, fontFamily: ctx.headingFont, fontSizePt: 16, fontWeight: "700", color: "#FFFFFF", align: "center" }),
    shape({ x: W / 2 - 0.3, y: 1.28, width: 0.6, height: 0.015, shape: "divider", fill: p }),
  ]);
  return { front, back };
};

export const AI_ARCHETYPES: { name: string; style: string; fn: AiArchetype }[] = [
  { name: "ai-texture-elegant", style: "elegant", fn: aiTextureElegant },
  { name: "ai-texture-luxury", style: "luxury", fn: aiTextureLuxury },
  { name: "ai-texture-botanical", style: "elegant", fn: aiTextureBotanical },
  { name: "ai-texture-paintbrush", style: "bold", fn: aiTexturePaintbrush },
];
