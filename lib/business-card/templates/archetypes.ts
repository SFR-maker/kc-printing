import type { CardSide, TextElement, ShapeElement, QrElement } from "../schema";
import type { CategoryContent } from "./categories";
import { contrastRatio } from "../validate";

/**
 * Category palette data uses the third color as a flavor "ink/neutral" slot, which for
 * several categories is a light background tint rather than a dark text color. Any
 * archetype that renders that color as body text or a QR foreground on a white/light
 * ground must go through this guard instead of destructuring palette[2] directly, or
 * text/QR contrast silently fails for those categories (caught by the template audit test).
 */
function readableInk(candidate: string): string {
  return contrastRatio(candidate, "#FFFFFF") >= 4.5 ? candidate : "#161616";
}

let counter = 0;
function id(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

function text(partial: Partial<TextElement> & Pick<TextElement, "x" | "y" | "width" | "height" | "text">): TextElement {
  return {
    id: id("text"),
    type: "text",
    rotation: 0,
    zIndex: 1,
    opacity: 1,
    locked: false,
    visible: true,
    fontFamily: "Inter",
    fontSizePt: 12,
    fontWeight: "400",
    italic: false,
    underline: false,
    textTransform: "none",
    align: "left",
    lineHeight: 1.15,
    letterSpacing: 0,
    color: "#111111",
    backgroundColor: null,
    ...partial,
  };
}

function shape(partial: Partial<ShapeElement> & Pick<ShapeElement, "x" | "y" | "width" | "height" | "shape">): ShapeElement {
  return {
    id: id("shape"),
    type: "shape",
    rotation: 0,
    zIndex: 0,
    opacity: 1,
    locked: false,
    visible: true,
    fill: "#000000",
    stroke: null,
    strokeWidthPx: 0,
    cornerRadiusIn: 0,
    gradient: null,
    ...partial,
  };
}

function qrPlaceholder(partial: Partial<QrElement> & Pick<QrElement, "x" | "y" | "width" | "height">): QrElement {
  return {
    id: id("qr"),
    type: "qr",
    rotation: 0,
    zIndex: 1,
    opacity: 1,
    locked: false,
    visible: true,
    payloadType: "url",
    value: "",
    foreground: "#111111",
    background: "#FFFFFF",
    errorCorrection: "M",
    ...partial,
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

function contactBlock(ctx: CategoryContent, x: number, y: number, width: number, color: string, align: "left" | "center" | "right" = "left"): TextElement[] {
  const lines = [ctx.phone, ctx.email, ctx.website];
  return lines.map((line, i) =>
    text({ x, y: y + i * 0.19, width, height: 0.18, text: line, fontFamily: ctx.bodyFont, fontSizePt: 7, color, align })
  );
}

function logoSlot(x: number, y: number, size: number, accent: string): [ShapeElement, TextElement] {
  return [
    shape({ x, y, width: size, height: size, shape: "rect", fill: null, stroke: accent, strokeWidthPx: 3, cornerRadiusIn: 0.06 }),
    text({ x, y: y + size / 2 - 0.08, width: size, height: 0.16, text: "LOGO", fontFamily: "Inter", fontSizePt: 6, color: accent, align: "center", letterSpacing: 1 }),
  ];
}

export type Archetype = (ctx: CategoryContent) => { front: CardSide; back: CardSide };

/** 1. Left color rail with stacked name/title/contact in the remaining white space. */
export const centeredStack: Archetype = (ctx) => {
  const [p, , inkRaw] = ctx.palette;
  const ink = readableInk(inkRaw);
  const front = solidSide("#FFFFFF", [
    shape({ x: 0, y: 0, width: 1.15, height: H, shape: "rect", fill: p }),
    ...logoSlot(0.28, 0.35, 0.6, "#FFFFFF"),
    text({ x: 1.4, y: 0.55, width: 2.1, height: 0.3, text: ctx.name, fontFamily: ctx.headingFont, fontSizePt: 15, fontWeight: "700", color: ink }),
    text({ x: 1.4, y: 0.82, width: 2.1, height: 0.22, text: ctx.title, fontFamily: ctx.bodyFont, fontSizePt: 9, color: p }),
    shape({ x: 1.4, y: 1.08, width: 0.5, height: 0.02, shape: "divider", fill: p }),
    ...contactBlock(ctx, 1.4, 1.22, 2.1, "#333333"),
  ]);
  const back = solidSide(p, [
    text({ x: 0.3, y: 0.9, width: 3.15, height: 0.35, text: ctx.company, fontFamily: ctx.headingFont, fontSizePt: 16, fontWeight: "700", color: "#FFFFFF", align: "center" }),
  ]);
  return { front, back };
};

/** 2. Angled color wedge behind the name block, created from a rotated rect. */
export const splitDiagonal: Archetype = (ctx) => {
  const [p, sRaw, inkRaw] = ctx.palette;
  const ink = readableInk(inkRaw);
  const s = readableInk(sRaw);
  const front = solidSide("#FFFFFF", [
    shape({ x: -0.6, y: -0.4, width: 2.6, height: 3.2, shape: "rect", fill: p, rotation: -12, zIndex: 0 }),
    text({ x: 0.3, y: 0.35, width: 2.4, height: 0.3, text: ctx.name, fontFamily: ctx.headingFont, fontSizePt: 15, fontWeight: "700", color: "#FFFFFF", zIndex: 1 }),
    text({ x: 0.3, y: 0.62, width: 2.4, height: 0.22, text: ctx.title, fontFamily: ctx.bodyFont, fontSizePt: 9, color: "#FFFFFF", zIndex: 1 }),
    text({ x: 2.0, y: 1.3, width: 1.5, height: 0.2, text: ctx.company, fontFamily: ctx.bodyFont, fontSizePt: 8, fontWeight: "600", color: ink, align: "right", zIndex: 1 }),
    ...contactBlock(ctx, 2.0, 1.55, 1.5, s, "right"),
  ]);
  const back = solidSide("#FFFFFF", [
    shape({ x: -0.6, y: -0.4, width: 2.6, height: 3.2, shape: "rect", fill: p, rotation: -12 }),
    ...logoSlot(1.5, 0.85, 0.55, ink),
  ]);
  return { front, back };
};

/** 3. Full-width color bar across the top bleeding to the edges. */
export const topBanner: Archetype = (ctx) => {
  const [p, , inkRaw] = ctx.palette;
  const ink = readableInk(inkRaw);
  const front = solidSide("#FFFFFF", [
    shape({ x: 0, y: 0, width: W, height: 0.75, shape: "rect", fill: p }),
    text({ x: 0.3, y: 0.22, width: 3.15, height: 0.32, text: ctx.company, fontFamily: ctx.headingFont, fontSizePt: 14, fontWeight: "700", color: "#FFFFFF" }),
    text({ x: 0.3, y: 0.95, width: 3.15, height: 0.26, text: ctx.name, fontFamily: ctx.bodyFont, fontSizePt: 11, fontWeight: "600", color: ink }),
    text({ x: 0.3, y: 1.18, width: 3.15, height: 0.2, text: ctx.title, fontFamily: ctx.bodyFont, fontSizePt: 8, color: p }),
    ...contactBlock(ctx, 0.3, 1.62, 3.15, "#333333"),
  ]);
  const back = solidSide(p, [
    shape({ x: 0, y: H - 0.4, width: W, height: 0.4, shape: "rect", fill: "#FFFFFF", opacity: 0.12 }),
    ...logoSlot(1.55, 0.7, 0.65, "#FFFFFF"),
  ]);
  return { front, back };
};

/** 4. Thin inset border frame, centered name, divider, centered contact stack. */
export const borderedFrame: Archetype = (ctx) => {
  const [p, , inkRaw] = ctx.palette;
  const ink = readableInk(inkRaw);
  const front = solidSide("#FFFFFF", [
    shape({ x: 0.2, y: 0.2, width: W - 0.4, height: H - 0.4, shape: "rect", fill: null, stroke: p, strokeWidthPx: 2 }),
    text({ x: 0.3, y: 0.55, width: W - 0.6, height: 0.3, text: ctx.name, fontFamily: ctx.headingFont, fontSizePt: 15, fontWeight: "700", color: ink, align: "center" }),
    text({ x: 0.3, y: 0.85, width: W - 0.6, height: 0.22, text: `${ctx.title} · ${ctx.company}`, fontFamily: ctx.bodyFont, fontSizePt: 8, color: p, align: "center" }),
    shape({ x: W / 2 - 0.3, y: 1.15, width: 0.6, height: 0.015, shape: "divider", fill: p }),
    text({ x: 0.3, y: 1.32, width: W - 0.6, height: 0.18, text: `${ctx.phone}   •   ${ctx.email}`, fontFamily: ctx.bodyFont, fontSizePt: 7, color: "#333333", align: "center" }),
    text({ x: 0.3, y: 1.52, width: W - 0.6, height: 0.18, text: ctx.website, fontFamily: ctx.bodyFont, fontSizePt: 7, color: "#333333", align: "center" }),
  ]);
  const back = solidSide("#FFFFFF", [
    shape({ x: 0.2, y: 0.2, width: W - 0.4, height: H - 0.4, shape: "rect", fill: null, stroke: p, strokeWidthPx: 2 }),
    ...logoSlot(1.5, 0.75, 0.6, p),
  ]);
  return { front, back };
};

/** 5. Minimal — small corner accent circle, generous white space, left-aligned text. */
export const minimalCorner: Archetype = (ctx) => {
  const [p, , inkRaw] = ctx.palette;
  const ink = readableInk(inkRaw);
  const front = solidSide("#FFFFFF", [
    shape({ x: W - 0.9, y: H - 0.9, width: 1.4, height: 1.4, shape: "ellipse", fill: p, opacity: 0.12 }),
    text({ x: 0.32, y: 0.4, width: 2.6, height: 0.3, text: ctx.name, fontFamily: ctx.headingFont, fontSizePt: 15, fontWeight: "600", color: ink }),
    text({ x: 0.32, y: 0.68, width: 2.6, height: 0.2, text: ctx.title, fontFamily: ctx.bodyFont, fontSizePt: 8.5, color: "#666666" }),
    text({ x: 0.32, y: 1.55, width: 2.6, height: 0.2, text: ctx.company, fontFamily: ctx.bodyFont, fontSizePt: 8, fontWeight: "600", color: p }),
    ...contactBlock(ctx, 0.32, 1.78, 2.6, "#333333"),
  ]);
  const back = solidSide("#FFFFFF", [
    shape({ x: -0.3, y: -0.3, width: 1.4, height: 1.4, shape: "ellipse", fill: p, opacity: 0.12 }),
    ...logoSlot(1.55, 0.8, 0.6, ink),
  ]);
  return { front, back };
};

/** 6. Bold — full-bleed solid brand color, white text, bottom accent line. */
export const boldBlock: Archetype = (ctx) => {
  const [p, s] = ctx.palette;
  const front = solidSide(p, [
    text({ x: 0.32, y: 0.5, width: 3.1, height: 0.32, text: ctx.name.toUpperCase(), fontFamily: ctx.headingFont, fontSizePt: 15, fontWeight: "800", color: "#FFFFFF", letterSpacing: 1 }),
    text({ x: 0.32, y: 0.82, width: 3.1, height: 0.2, text: ctx.title, fontFamily: ctx.bodyFont, fontSizePt: 8.5, color: s }),
    shape({ x: 0, y: H - 0.55, width: W, height: 0.55, shape: "rect", fill: "#000000", opacity: 0.18 }),
    ...contactBlock(ctx, 0.32, H - 0.48, 3.1, "#FFFFFF"),
  ]);
  const back = solidSide("#FFFFFF", [
    text({ x: 0.3, y: 0.9, width: W - 0.6, height: 0.35, text: ctx.company, fontFamily: ctx.headingFont, fontSizePt: 16, fontWeight: "800", color: p, align: "center" }),
  ]);
  return { front, back };
};

/** 7. Photo panel — right-half image/logo slot, left-half text block. */
export const photoPanel: Archetype = (ctx) => {
  const [p, , inkRaw] = ctx.palette;
  const ink = readableInk(inkRaw);
  const front = solidSide("#FFFFFF", [
    shape({ x: 2.55, y: 0, width: W - 2.55, height: H, shape: "rect", fill: p, opacity: 0.14 }),
    ...logoSlot(2.75, 0.75, 0.75, p),
    text({ x: 0.3, y: 0.42, width: 2.1, height: 0.3, text: ctx.name, fontFamily: ctx.headingFont, fontSizePt: 14, fontWeight: "700", color: ink }),
    text({ x: 0.3, y: 0.68, width: 2.1, height: 0.2, text: ctx.title, fontFamily: ctx.bodyFont, fontSizePt: 8.5, color: p }),
    ...contactBlock(ctx, 0.3, 1.35, 2.1, "#333333"),
  ]);
  const back = solidSide(p, [
    text({ x: 0.3, y: 0.9, width: W - 0.6, height: 0.35, text: ctx.company, fontFamily: ctx.headingFont, fontSizePt: 15, fontWeight: "700", color: "#FFFFFF", align: "center" }),
  ]);
  return { front, back };
};

/** 8. Icon row — underline accent under name, three-column contact row with divider ticks, QR on back. */
export const iconRow: Archetype = (ctx) => {
  const [p, , inkRaw] = ctx.palette;
  const ink = readableInk(inkRaw);
  const front = solidSide("#FFFFFF", [
    text({ x: 0.3, y: 0.32, width: 3.15, height: 0.3, text: ctx.name, fontFamily: ctx.headingFont, fontSizePt: 15, fontWeight: "700", color: ink }),
    shape({ x: 0.3, y: 0.68, width: 0.9, height: 0.03, shape: "divider", fill: p }),
    text({ x: 0.3, y: 0.8, width: 3.15, height: 0.2, text: `${ctx.title} — ${ctx.company}`, fontFamily: ctx.bodyFont, fontSizePt: 8, color: "#555555" }),
    text({ x: 0.3, y: 1.45, width: 1.05, height: 0.18, text: ctx.phone, fontFamily: ctx.bodyFont, fontSizePt: 6.5, color: ink, align: "left" }),
    text({ x: 1.35, y: 1.45, width: 1.05, height: 0.18, text: ctx.email, fontFamily: ctx.bodyFont, fontSizePt: 6.5, color: ink, align: "left" }),
    text({ x: 2.4, y: 1.45, width: 1.05, height: 0.18, text: ctx.website, fontFamily: ctx.bodyFont, fontSizePt: 6.5, color: ink, align: "left" }),
    shape({ x: 0.3, y: 1.4, width: W - 0.6, height: 0.012, shape: "divider", fill: "#DDDDDD" }),
  ]);
  const back = solidSide("#FFFFFF", [
    qrPlaceholder({ x: W / 2 - 0.45, y: H / 2 - 0.45, width: 0.9, height: 0.9, payloadType: "url", value: `https://${ctx.website}`, foreground: ink, background: "#FFFFFF" }),
    text({ x: 0.3, y: H - 0.4, width: W - 0.6, height: 0.2, text: "Scan to visit our website", fontFamily: ctx.bodyFont, fontSizePt: 7, color: "#777777", align: "center" }),
  ]);
  return { front, back };
};

export const ARCHETYPES: { name: string; style: string; fn: Archetype }[] = [
  { name: "centered-stack", style: "corporate", fn: centeredStack },
  { name: "split-diagonal", style: "bold", fn: splitDiagonal },
  { name: "top-banner", style: "modern", fn: topBanner },
  { name: "bordered-frame", style: "elegant", fn: borderedFrame },
  { name: "minimal-corner", style: "minimal", fn: minimalCorner },
  { name: "bold-block", style: "bold", fn: boldBlock },
  { name: "photo-panel", style: "creative", fn: photoPanel },
  { name: "icon-row", style: "friendly", fn: iconRow },
];
