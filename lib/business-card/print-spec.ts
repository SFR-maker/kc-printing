export const DPI = 300;

/**
 * Business-card house spec. Bleed is 0.05in per side, so the full-bleed document is 3.6 x 2.1 and
 * trims to 3.5 x 2. Customer-supplied artwork is validated against, and auto-fitted to, these same
 * numbers - the shop prints one document size, not two.
 *
 * Postcards, banners and rigid signs keep their own 0.125in bleed (see the *_SIZES presets below);
 * only business cards run on the tighter spec.
 */
export const PRINT_SPEC = {
  trimWidthIn: 3.5,
  trimHeightIn: 2,
  bleedIn: 0.05,
  safeZoneInsetIn: 0.125,
  dpi: DPI,
} as const;

export const BLEED_WIDTH_IN = PRINT_SPEC.trimWidthIn + PRINT_SPEC.bleedIn * 2;
export const BLEED_HEIGHT_IN = PRINT_SPEC.trimHeightIn + PRINT_SPEC.bleedIn * 2;

/**
 * Business cards trim to 3.5 x 2 either way, but the required bleed depends on the corner finish.
 * A rounded-corner card is die-cut rather than guillotined, and the die has more positional play,
 * so the press needs a wider bleed margin to cut into.
 *
 *   Square corners   3.6   x 2.1    (0.05in per edge)
 *   Rounded corners  3.825 x 2.325  (0.1625in per edge)
 *
 * Both figures come from the printer's published templates. Designs are stored on the square-corner
 * spec; rebleedSide converts to the rounded document at export time when that finish is selected,
 * so a single stored geometry produces a correct file either way.
 */
export const BUSINESS_CARD_BLEED = {
  square: 0.05,
  rounded: 0.1625,
} as const;

export interface BusinessCardDocSpec {
  trimWidthIn: number;
  trimHeightIn: number;
  bleedIn: number;
  safeZoneInsetIn: number;
  docWidthIn: number;
  docHeightIn: number;
}

/** The document a customer must supply (and that we export) for a given corner finish. */
export function businessCardDocSpec(roundCorners: boolean): BusinessCardDocSpec {
  const bleedIn = roundCorners ? BUSINESS_CARD_BLEED.rounded : BUSINESS_CARD_BLEED.square;
  return {
    trimWidthIn: PRINT_SPEC.trimWidthIn,
    trimHeightIn: PRINT_SPEC.trimHeightIn,
    bleedIn,
    safeZoneInsetIn: PRINT_SPEC.safeZoneInsetIn,
    docWidthIn: round4(PRINT_SPEC.trimWidthIn + bleedIn * 2),
    docHeightIn: round4(PRINT_SPEC.trimHeightIn + bleedIn * 2),
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export const BLEED_PX_WIDTH = Math.round(BLEED_WIDTH_IN * DPI);
export const BLEED_PX_HEIGHT = Math.round(BLEED_HEIGHT_IN * DPI);
export const TRIM_PX_WIDTH = Math.round(PRINT_SPEC.trimWidthIn * DPI);
export const TRIM_PX_HEIGHT = Math.round(PRINT_SPEC.trimHeightIn * DPI);
export const BLEED_PX_INSET = Math.round(PRINT_SPEC.bleedIn * DPI);
export const SAFE_ZONE_PX_INSET = BLEED_PX_INSET + Math.round(PRINT_SPEC.safeZoneInsetIn * DPI);

export const MIN_PRINT_DPI = 150;
export const RECOMMENDED_DPI = 300;
export const MIN_FONT_SIZE_PT = 6;

export type DesignProduct = "business-card" | "postcard" | "banner" | "rigid-sign";

export interface SizePreset {
  key: string;
  label: string;
  trimWidthIn: number;
  trimHeightIn: number;
  bleedIn: number;
  safeZoneInsetIn: number;
}

export const BUSINESS_CARD_SIZES: SizePreset[] = [
  { key: "standard", label: "Standard (3.5 x 2 in)", trimWidthIn: 3.5, trimHeightIn: 2, bleedIn: 0.05, safeZoneInsetIn: 0.125 },
];

// Real sizes from lib/service-data.ts's Postcards spec ("Popular Sizes").
export const POSTCARD_SIZES: SizePreset[] = [
  { key: "3x5", label: "3 x 5 in", trimWidthIn: 5, trimHeightIn: 3, bleedIn: 0.125, safeZoneInsetIn: 0.125 },
  { key: "4x6", label: "4 x 6 in", trimWidthIn: 6, trimHeightIn: 4, bleedIn: 0.125, safeZoneInsetIn: 0.125 },
  { key: "5x7", label: "5 x 7 in", trimWidthIn: 7, trimHeightIn: 5, bleedIn: 0.125, safeZoneInsetIn: 0.125 },
  { key: "5.5x8.5", label: "5.5 x 8.5 in", trimWidthIn: 8.5, trimHeightIn: 5.5, bleedIn: 0.125, safeZoneInsetIn: 0.125 },
  { key: "6x9", label: "6 x 9 in", trimWidthIn: 9, trimHeightIn: 6, bleedIn: 0.125, safeZoneInsetIn: 0.125 },
  { key: "6x11", label: "6 x 11 in", trimWidthIn: 11, trimHeightIn: 6, bleedIn: 0.125, safeZoneInsetIn: 0.125 },
];

// Real sizes from lib/service-data.ts's Banners spec ("Roll-Up Sizes" / "Vinyl Sizes"). Roll-up
// stands print at a much lower viewing-distance DPI than small format, but the editor still works
// in inches, so only the safe zone differs (roll-ups need a bigger inset for the stand's clamp bar).
export const BANNER_SIZES: SizePreset[] = [
  { key: "rollup-24x81", label: "Roll-Up Stand 24 x 81 in", trimWidthIn: 24, trimHeightIn: 81, bleedIn: 0.125, safeZoneInsetIn: 0.5 },
  { key: "rollup-33x81", label: "Roll-Up Stand 33 x 81 in", trimWidthIn: 33, trimHeightIn: 81, bleedIn: 0.125, safeZoneInsetIn: 0.5 },
  { key: "rollup-36x81", label: "Roll-Up Stand 36 x 81 in", trimWidthIn: 36, trimHeightIn: 81, bleedIn: 0.125, safeZoneInsetIn: 0.5 },
  { key: "tabletop-24x63", label: "Table-Top Stand 24 x 63 in", trimWidthIn: 24, trimHeightIn: 63, bleedIn: 0.125, safeZoneInsetIn: 0.5 },
  { key: "vinyl-2x4", label: "Vinyl Banner 2 x 4 ft", trimWidthIn: 48, trimHeightIn: 24, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-3x6", label: "Vinyl Banner 3 x 6 ft", trimWidthIn: 72, trimHeightIn: 36, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-4x8", label: "Vinyl Banner 4 x 8 ft", trimWidthIn: 96, trimHeightIn: 48, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-4x10", label: "Vinyl Banner 4 x 10 ft", trimWidthIn: 120, trimHeightIn: 48, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
];

// Bounding-box size per shape — the live editor designs on a plain rectangle of this size (see
// lib/business-card/shape-paths.ts), and the shape is applied as a clip mask at render/export
// time, so these dimensions just need to comfortably contain each shape's silhouette.
export const RIGID_SIGN_SIZES: SizePreset[] = [
  { key: "rounded-square", label: "Rounded Square 12 x 12 in", trimWidthIn: 12, trimHeightIn: 12, bleedIn: 0.125, safeZoneInsetIn: 0.5 },
  { key: "circle", label: "Circle 12 in diameter", trimWidthIn: 12, trimHeightIn: 12, bleedIn: 0.125, safeZoneInsetIn: 0.5 },
  { key: "star", label: "Star 14 x 14 in", trimWidthIn: 14, trimHeightIn: 14, bleedIn: 0.125, safeZoneInsetIn: 0.75 },
  { key: "arrow", label: "Arrow 18 x 10 in", trimWidthIn: 18, trimHeightIn: 10, bleedIn: 0.125, safeZoneInsetIn: 0.75 },
  { key: "house", label: "House 12 x 13 in", trimWidthIn: 12, trimHeightIn: 13, bleedIn: 0.125, safeZoneInsetIn: 0.5 },
];

export const RIGID_SIGN_MATERIALS = ["Acrylic", "Aluminum", "PVC", "Foam Board", "Corrugated Plastic"] as const;

export function sizePresetsFor(product: DesignProduct): SizePreset[] {
  if (product === "postcard") return POSTCARD_SIZES;
  if (product === "banner") return BANNER_SIZES;
  if (product === "rigid-sign") return RIGID_SIGN_SIZES;
  return BUSINESS_CARD_SIZES;
}

export function defaultSizeFor(product: DesignProduct): SizePreset {
  return sizePresetsFor(product)[0];
}

/** Plural URL segment used under /services/{segment}/... */
export const PRODUCT_ROUTE_SEGMENT: Record<DesignProduct, string> = {
  "business-card": "business-cards",
  postcard: "postcards",
  banner: "banners",
  "rigid-sign": "rigid-signs",
};

/** Matches the Prisma DesignProduct enum values (kept as plain strings here so this file has no
 * dependency on the generated Prisma client). */
export const PRODUCT_DB_VALUE: Record<DesignProduct, "BUSINESS_CARD" | "POSTCARD" | "BANNER" | "RIGID_SIGN"> = {
  "business-card": "BUSINESS_CARD",
  postcard: "POSTCARD",
  banner: "BANNER",
  "rigid-sign": "RIGID_SIGN",
};

export function inchesToPx(inches: number, dpi: number = DPI): number {
  return inches * dpi;
}

export function pxToInches(px: number, dpi: number = DPI): number {
  return px / dpi;
}

export function effectiveImageDpi(naturalWidthPx: number, renderedWidthIn: number): number {
  if (renderedWidthIn <= 0) return Infinity;
  return naturalWidthPx / renderedWidthIn;
}
