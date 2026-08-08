import type { CardSide, TextElement, ShapeElement } from "../schema";
import type { CategoryContent } from "./categories";
import type { SignShape } from "../shape-paths";
import { WINDOW_DECAL_SIZES } from "../print-spec";

/**
 * Layouts for storefront window graphics.
 *
 * A window decal is not a small rigid sign. It is read through glass, from the pavement, usually at
 * an angle and usually in a second or two before someone walks past - so these layouts are built
 * around one dominant message with everything else subordinate to it, rather than around a balanced
 * composition. Type is set heavier and larger relative to the piece than on any other product here.
 *
 * The three archetypes cover what a shop actually puts on its window: what the business is, when it
 * is open, and what is on offer right now.
 */

let counter = 0;
function id(prefix: string): string {
  counter += 1;
  return `decal-${prefix}-${counter}`;
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

/**
 * The formats templates are drawn at.
 *
 * Four rather than all fifteen sellable sizes: a gallery of the same layout at every proportion is
 * noise, and the editor lets any design be resized afterwards. These are the four shapes a window
 * graphic is actually bought in - a wide banner across the top of the glass, a landscape panel, a
 * portrait panel beside the door, and a die-cut circle.
 *
 * `mask` must be a SignShape the renderer can clip to (lib/business-card/shape-paths.ts). The
 * catalogue also sells octagons, stars and arrows; those are orderable and designable by picking the
 * size in the editor, but they are not seeded as templates because a layout that survives a star
 * silhouette is a different layout, not this one at another size.
 */
export interface WindowFormat {
  key: string;
  label: string;
  /** A WINDOW_DECAL_SIZES key. */
  sizeKey: string;
  mask: SignShape;
}

export const WINDOW_FORMATS: WindowFormat[] = [
  { key: "banner", label: "Window Banner", sizeKey: "banner-24x9", mask: "rectangle" },
  { key: "landscape", label: "Landscape", sizeKey: "landscape-24x18", mask: "rectangle" },
  { key: "portrait", label: "Portrait", sizeKey: "portrait-18x24", mask: "rectangle" },
  { key: "circle", label: "Circle", sizeKey: "circle-24", mask: "circle" },
];

function preset(format: WindowFormat) {
  return WINDOW_DECAL_SIZES.find((s) => s.key === format.sizeKey) ?? WINDOW_DECAL_SIZES[0];
}

function dims(format: WindowFormat): { w: number; h: number } {
  const p = preset(format);
  return { w: p.trimWidthIn + p.bleedIn * 2, h: p.trimHeightIn + p.bleedIn * 2 };
}

function side(format: WindowFormat, background: CardSide["background"], elements: CardSide["elements"]): CardSide {
  const { w, h } = dims(format);
  const p = preset(format);
  return {
    physicalWidthIn: w, physicalHeightIn: h,
    bleedIn: p.bleedIn, safeZoneInsetIn: p.safeZoneInsetIn,
    shapeMask: format.mask, background, elements,
  };
}

/**
 * Window signage prints on one face, so the back is a blank of the right geometry rather than a
 * second design. It exists because the schema and the editor both expect two sides; nothing is ever
 * printed from it.
 */
function blankBack(format: WindowFormat): CardSide {
  return side(format, { type: "solid", color: "#FFFFFF", gradient: null }, []);
}

export type WindowDecalArchetype = (ctx: CategoryContent, format: WindowFormat) => { front: CardSide; back: CardSide };

/**
 * Type scale for a window graphic.
 *
 * Sized off the short edge rather than the area: a 24 x 9 banner and a 24 x 18 panel are the same
 * width, but type scaled to width would overflow the banner's height entirely. The short edge is
 * what constrains a line of text in every one of these formats.
 */
function scale(w: number, h: number): number {
  return Math.min(w, h);
}

/**
 * 1. Open for business — the business name at maximum size on a full-bleed colour field, with the
 * one line a passer-by needs underneath. The default a shop wants on its door.
 */
export const openForBusiness: WindowDecalArchetype = (ctx, format) => {
  const [p, s] = ctx.palette;
  const { w, h } = dims(format);
  const k = scale(w, h);
  const front = side(format, { type: "solid", color: p, gradient: null }, [
    text({
      x: w * 0.08, y: h * 0.3, width: w * 0.84, height: h * 0.24,
      text: ctx.company, fontFamily: ctx.headingFont, fontSizePt: k * 5.2, fontWeight: "800",
      color: "#FFFFFF", align: "center", lineHeight: 1.02,
    }),
    shape({ x: w / 2 - w * 0.1, y: h * 0.58, width: w * 0.2, height: h * 0.012, shape: "divider", fill: s }),
    text({
      x: w * 0.1, y: h * 0.63, width: w * 0.8, height: h * 0.1,
      text: ctx.title.toUpperCase(), fontFamily: ctx.bodyFont, fontSizePt: k * 2.1, fontWeight: "600",
      color: "#FFFFFF", align: "center", letterSpacing: 2,
    }),
    text({
      x: w * 0.1, y: h * 0.75, width: w * 0.8, height: h * 0.1,
      text: ctx.phone, fontFamily: ctx.bodyFont, fontSizePt: k * 2.4,
      color: "#FFFFFF", align: "center",
    }),
  ]);
  return { front, back: blankBack(format) };
};

/**
 * 2. Store hours — a white panel with the name above and opening times below, which is the single
 * most-ordered window decal in any print shop and the one thing a customer standing outside a closed
 * shop is looking for.
 */
export const storeHours: WindowDecalArchetype = (ctx, format) => {
  const [p, , ink] = ctx.palette;
  const { w, h } = dims(format);
  const k = scale(w, h);
  const front = side(format, { type: "solid", color: "#FFFFFF", gradient: null }, [
    shape({ x: 0, y: 0, width: w, height: h * 0.24, shape: "rect", fill: p, zIndex: 0 }),
    text({
      x: w * 0.08, y: h * 0.06, width: w * 0.84, height: h * 0.12,
      text: ctx.company, fontFamily: ctx.headingFont, fontSizePt: k * 2.9, fontWeight: "800",
      color: "#FFFFFF", align: "center", lineHeight: 1.05,
    }),
    text({
      x: w * 0.1, y: h * 0.32, width: w * 0.8, height: h * 0.09,
      text: "STORE HOURS", fontFamily: ctx.bodyFont, fontSizePt: k * 2.2, fontWeight: "700",
      color: ink, align: "center", letterSpacing: 3,
    }),
    text({
      x: w * 0.1, y: h * 0.45, width: w * 0.8, height: h * 0.3,
      text: "Mon – Fri   9:00 – 6:00\nSaturday   10:00 – 4:00\nSunday   Closed",
      fontFamily: ctx.bodyFont, fontSizePt: k * 2.0, color: ink, align: "center", lineHeight: 1.6,
    }),
    text({
      x: w * 0.1, y: h * 0.82, width: w * 0.8, height: h * 0.08,
      text: ctx.website, fontFamily: ctx.bodyFont, fontSizePt: k * 1.7, fontWeight: "600",
      color: p, align: "center",
    }),
  ]);
  return { front, back: blankBack(format) };
};

/**
 * 3. Offer panel — a promotional decal, the kind swapped out every few weeks. Deliberately the
 * loudest of the three: the offer outranks the business name, because on a window that is the thing
 * doing the work.
 */
export const offerPanel: WindowDecalArchetype = (ctx, format) => {
  const [p, s, ink] = ctx.palette;
  const { w, h } = dims(format);
  const k = scale(w, h);
  const front = side(format, { type: "solid", color: ink, gradient: null }, [
    text({
      x: w * 0.08, y: h * 0.16, width: w * 0.84, height: h * 0.12,
      text: "NOW OPEN", fontFamily: ctx.bodyFont, fontSizePt: k * 2.0, fontWeight: "700",
      color: s, align: "center", letterSpacing: 4,
    }),
    text({
      x: w * 0.06, y: h * 0.31, width: w * 0.88, height: h * 0.26,
      text: "20% OFF", fontFamily: ctx.headingFont, fontSizePt: k * 6.4, fontWeight: "800",
      color: "#FFFFFF", align: "center", lineHeight: 1.0,
    }),
    shape({ x: w * 0.2, y: h * 0.61, width: w * 0.6, height: h * 0.014, shape: "divider", fill: p }),
    text({
      x: w * 0.1, y: h * 0.66, width: w * 0.8, height: h * 0.12,
      text: ctx.company, fontFamily: ctx.headingFont, fontSizePt: k * 2.4, fontWeight: "700",
      color: "#FFFFFF", align: "center", lineHeight: 1.1,
    }),
    text({
      x: w * 0.1, y: h * 0.82, width: w * 0.8, height: h * 0.08,
      text: ctx.phone, fontFamily: ctx.bodyFont, fontSizePt: k * 1.9,
      color: s, align: "center",
    }),
  ]);
  return { front, back: blankBack(format) };
};

export const WINDOW_DECAL_ARCHETYPES: { name: string; style: string; fn: WindowDecalArchetype }[] = [
  { name: "open-for-business", style: "bold", fn: openForBusiness },
  { name: "store-hours", style: "minimal", fn: storeHours },
  { name: "offer-panel", style: "modern", fn: offerPanel },
];
