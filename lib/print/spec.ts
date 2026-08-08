/**
 * Print geometry and file requirements, for every product rather than just business cards.
 *
 * The card flow works because one module knows the document size, the trim line, the safe zone and
 * the resolution floor, and the uploader, the inspector and the proof editor all read from it.
 * Extending that to banners, postcards and signs means the same shape has to describe products that
 * genuinely differ:
 *
 *   business cards  0.05in bleed (0.1625in rounded), 300 DPI, inches
 *   postcards       0.125in bleed, 300 DPI
 *   banners         0.125in bleed, 150 DPI - viewed from across a car park, not held in a hand
 *
 * Copying the card spec across and editing the numbers would put a 300 DPI floor on a banner and
 * reject files the printer would happily accept, so resolution belongs in the spec, not in the
 * inspector.
 */

export type ProductKind = "business-cards" | "postcards" | "banners" | "rigid-signs" | "window-decals";

export interface PrintSpec {
  product: ProductKind;
  /** Finished size after cutting, in inches. */
  trimWidthIn: number;
  trimHeightIn: number;
  /** Extra artwork beyond the trim, per edge. */
  bleedIn: number;
  /** Keep text and logos this far inside the trim line. */
  safeZoneInsetIn: number;
  /** Below this a file prints visibly soft and is refused. */
  minDpi: number;
  /** What we ask for. Above this adds nothing a customer would see. */
  recommendedDpi: number;
  /** Upload ceiling in megabytes. */
  maxFileMb: number;
  /** Human note shown on the upload step, where a product has a quirk worth stating. */
  note?: string;
}

/** Full document the customer supplies: trim plus bleed on every edge. */
export function docSize(spec: PrintSpec): { widthIn: number; heightIn: number } {
  return {
    widthIn: round4(spec.trimWidthIn + spec.bleedIn * 2),
    heightIn: round4(spec.trimHeightIn + spec.bleedIn * 2),
  };
}

/**
 * Per-product defaults, from each printer template.
 *
 * Banners sit at 150 DPI deliberately. A 4 x 8 ft banner at 300 DPI is a 14,400 x 28,800 pixel file
 * that nothing on a customer's machine will produce, and the printer does not ask for it.
 */
const DEFAULTS: Record<ProductKind, Omit<PrintSpec, "product" | "trimWidthIn" | "trimHeightIn">> = {
  "business-cards": { bleedIn: 0.05, safeZoneInsetIn: 0.125, minDpi: 200, recommendedDpi: 300, maxFileMb: 32 },
  postcards: { bleedIn: 0.125, safeZoneInsetIn: 0.125, minDpi: 200, recommendedDpi: 300, maxFileMb: 32 },
  banners: {
    bleedIn: 0.125,
    safeZoneInsetIn: 0.5,
    minDpi: 100,
    recommendedDpi: 150,
    maxFileMb: 75,
    note: "Grommets sit in the corners and every 2 ft along the edges, so keep anything you need to read well inside the safe zone.",
  },
  "rigid-signs": { bleedIn: 0.125, safeZoneInsetIn: 0.25, minDpi: 100, recommendedDpi: 150, maxFileMb: 75 },
  /**
   * Window film is cut on a plotter rather than guillotined, and the supplier quotes these at 150
   * DPI - a storefront decal is read from the pavement, not held in a hand.
   *
   * The safe zone is wider than a rigid sign's because the cut has more play on a flexible film and
   * because the graphic is applied by hand to glass: a line of text sitting 0.25" from the edge
   * reads as crooked if the application is a degree off, which it usually is.
   */
  "window-decals": {
    bleedIn: 0.125,
    safeZoneInsetIn: 0.5,
    minDpi: 100,
    recommendedDpi: 150,
    maxFileMb: 75,
    note: "Decals are applied by hand to glass, so keep text and logos well inside the safe zone - a graphic that runs close to the edge shows every degree of misalignment.",
  },
};

/**
 * Builds the spec for a product at a given finished size.
 *
 * `bleedOverride` exists for the one case where the finish changes the geometry: a rounded-corner
 * business card is die-cut rather than guillotined, and the die has more positional play, so it
 * needs a wider margin to cut into.
 */
export function printSpec(
  product: ProductKind,
  trimWidthIn: number,
  trimHeightIn: number,
  bleedOverride?: number
): PrintSpec {
  const d = DEFAULTS[product];
  return {
    product,
    trimWidthIn,
    trimHeightIn,
    ...d,
    bleedIn: bleedOverride ?? d.bleedIn,
  };
}

/**
 * Parses a finished size out of a supplier option label.
 *
 * Sizes arrive as human strings from the price tables - `4 ft x 8 ft`, `2" x 3.5" Horizontal`,
 * `18" x 24"` - and every product uses a different unit. Returning null rather than guessing keeps
 * an unparsed label from silently becoming a 1 x 1 inch document.
 */
export function parseTrimSize(label: string): { widthIn: number; heightIn: number } | null {
  const feet = label.match(/([\d.]+)\s*ft\s*x\s*([\d.]+)\s*ft/i);
  if (feet) return { widthIn: Number(feet[1]) * 12, heightIn: Number(feet[2]) * 12 };

  const inches = label.match(/([\d.]+)\s*"?\s*x\s*([\d.]+)\s*"/i);
  if (inches) return { widthIn: Number(inches[1]), heightIn: Number(inches[2]) };

  return null;
}

/** True when the label reads as portrait. Orientation changes the document, not the price. */
export function isVertical(label: string): boolean {
  return /vertical|portrait/i.test(label);
}

/** Applies orientation, so a "Vertical" option produces a taller document than a wider one. */
export function orientSpec(spec: PrintSpec, vertical: boolean): PrintSpec {
  const long = Math.max(spec.trimWidthIn, spec.trimHeightIn);
  const short = Math.min(spec.trimWidthIn, spec.trimHeightIn);
  return {
    ...spec,
    trimWidthIn: vertical ? short : long,
    trimHeightIn: vertical ? long : short,
  };
}

/**
 * Effective resolution of a raster at its placed size, and whether that is good enough.
 *
 * Scaling artwork up spreads the same pixels over more inches, so this has to be judged at the size
 * it will actually print rather than from the file's own DPI tag - which is metadata a designer can
 * set to anything.
 */
export function assessDpi(
  spec: PrintSpec,
  pixels: number,
  placedInches: number
): { dpi: number; level: "ok" | "low" | "reject" } {
  const dpi = Math.floor(pixels / placedInches);
  if (dpi < spec.minDpi) return { dpi, level: "reject" };
  if (dpi < spec.recommendedDpi) return { dpi, level: "low" };
  return { dpi, level: "ok" };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
