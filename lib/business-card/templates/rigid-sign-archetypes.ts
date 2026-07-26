import type { CardSide, TextElement, ShapeElement, ImageElement } from "../schema";
import type { CategoryContent } from "./categories";
import type { SignShape } from "../shape-paths";
import { RIGID_SIGN_SIZES } from "../print-spec";

let counter = 0;
function id(prefix: string): string {
  counter += 1;
  return `sign-${prefix}-${counter}`;
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

function dims(signShape: SignShape): { w: number; h: number } {
  const preset = RIGID_SIGN_SIZES.find((s) => s.key === signShape) ?? RIGID_SIGN_SIZES[0];
  return { w: preset.trimWidthIn + preset.bleedIn * 2, h: preset.trimHeightIn + preset.bleedIn * 2 };
}

function side(signShape: SignShape, background: CardSide["background"], elements: CardSide["elements"]): CardSide {
  const { w, h } = dims(signShape);
  const preset = RIGID_SIGN_SIZES.find((s) => s.key === signShape) ?? RIGID_SIGN_SIZES[0];
  return { physicalWidthIn: w, physicalHeightIn: h, bleedIn: preset.bleedIn, safeZoneInsetIn: preset.safeZoneInsetIn, shapeMask: signShape, background, elements };
}

function blankBack(signShape: SignShape): CardSide {
  const { w, h } = dims(signShape);
  const preset = RIGID_SIGN_SIZES.find((s) => s.key === signShape) ?? RIGID_SIGN_SIZES[0];
  return { physicalWidthIn: w, physicalHeightIn: h, bleedIn: preset.bleedIn, safeZoneInsetIn: preset.safeZoneInsetIn, shapeMask: signShape, background: { type: "solid", color: "#FFFFFF", gradient: null }, elements: [] };
}

export type RigidSignArchetype = (ctx: CategoryContent, signShape: SignShape) => { front: CardSide; back: CardSide };

/** 1. Bold color block — full-bleed category color, centered company name and contact line. Safe
 * enough to work inside any of the 5 die-cut shapes since everything is centered with generous
 * margin, staying clear of the narrowest points (star/arrow tips, house eaves). */
export const boldColorBlock: RigidSignArchetype = (ctx, signShape) => {
  const [p, s] = ctx.palette;
  const { w, h } = dims(signShape);
  const front = side(signShape, { type: "solid", color: p, gradient: null }, [
    text({ x: w * 0.12, y: h * 0.38, width: w * 0.76, height: h * 0.18, text: ctx.company, fontFamily: ctx.headingFont, fontSizePt: Math.min(w, h) * 5.5, fontWeight: "800", color: "#FFFFFF", align: "center", lineHeight: 1.05 }),
    shape({ x: w / 2 - w * 0.08, y: h * 0.56, width: w * 0.16, height: 0.03, shape: "divider", fill: s }),
    text({ x: w * 0.15, y: h * 0.6, width: w * 0.7, height: h * 0.08, text: ctx.phone, fontFamily: ctx.bodyFont, fontSizePt: Math.min(w, h) * 2.6, color: "#FFFFFF", align: "center" }),
    ...(ctx.website ? [text({ x: w * 0.15, y: h * 0.68, width: w * 0.7, height: h * 0.08, text: ctx.website, fontFamily: ctx.bodyFont, fontSizePt: Math.min(w, h) * 2.6, color: "#FFFFFF", align: "center" })] : []),
  ]);
  return { front, back: blankBack(signShape) };
};

/** 2. AI-generated navy skyline texture with a badge-style logo mark — the same corporate/civic
 * aesthetic used for the new banner archetypes, reused here since it reads well at any shape. */
export const aiTextureCorporate: RigidSignArchetype = (ctx, signShape) => {
  const [, s] = ctx.palette;
  const { w, h } = dims(signShape);
  // No decorative badge/logo mark here (unlike the banner version of this archetype) — a
  // fixed-position element that's safe on a plain rectangle can clip awkwardly on at least one of
  // the 5 very different sign silhouettes (star points, arrow head/tail, house roof peak), so
  // everything stays centered in the shape's widest, safest band instead.
  const front = side(signShape, { type: "solid", color: "#FFFFFF", gradient: null }, [
    bgImage("/images/templates/banner-texture-3.jpg", 900, 1800, w, h),
    text({ x: w * 0.1, y: h * 0.42, width: w * 0.8, height: h * 0.16, text: ctx.company, fontFamily: ctx.headingFont, fontSizePt: Math.min(w, h) * 4.5, fontWeight: "800", color: "#FFFFFF", align: "center", lineHeight: 1.05 }),
    text({ x: w * 0.15, y: h * 0.58, width: w * 0.7, height: h * 0.07, text: ctx.title, fontFamily: ctx.bodyFont, fontSizePt: Math.min(w, h) * 2.4, fontWeight: "600", color: s, align: "center" }),
    text({ x: w * 0.15, y: h * 0.66, width: w * 0.7, height: h * 0.07, text: ctx.phone, fontFamily: ctx.bodyFont, fontSizePt: Math.min(w, h) * 2.2, color: "#FFFFFF", align: "center" }),
  ]);
  return { front, back: blankBack(signShape) };
};

export const RIGID_SIGN_ARCHETYPES: { name: string; style: string; fn: RigidSignArchetype }[] = [
  { name: "bold-block", style: "bold", fn: boldColorBlock },
  { name: "ai-texture-corporate", style: "corporate", fn: aiTextureCorporate },
];
