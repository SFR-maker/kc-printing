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

export type DesignProduct = "business-card" | "postcard" | "banner" | "rigid-sign" | "window-decal";

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

/**
 * Banner sizes you can design on, which are exactly the sizes you can buy.
 *
 * Generated from lib/pricing/banners by scripts/compile-banner-catalogue, so the two lists cannot
 * drift; a test asserts every preset here is sellable and every sellable size has one.
 *
 * This was twelve hand-picked sizes plus four roll-up and table-top stands that had no price behind
 * them - design a "Roll-Up Stand 24 x 81 in" and there was no way to order it - while eight of the
 * twelve priced sizes had no preset at all. It is now the supplier's whole vinyl catalogue. Roll-ups
 * are a different product, a printed panel plus hardware, and return when they have prices.
 */
export const BANNER_SIZES: SizePreset[] = [
  { key: "vinyl-1x2", label: "Vinyl Banner 1 ft x 2 ft", trimWidthIn: 24, trimHeightIn: 12, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-1x3", label: "Vinyl Banner 1 ft x 3 ft", trimWidthIn: 36, trimHeightIn: 12, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-1x4", label: "Vinyl Banner 1 ft x 4 ft", trimWidthIn: 48, trimHeightIn: 12, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2x2", label: "Vinyl Banner 2 ft x 2 ft", trimWidthIn: 24, trimHeightIn: 24, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-1x5", label: "Vinyl Banner 1 ft x 5 ft", trimWidthIn: 60, trimHeightIn: 12, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-1_7x3", label: "Vinyl Banner 1.7 ft x 3 ft", trimWidthIn: 36, trimHeightIn: 20.4, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-1x6", label: "Vinyl Banner 1 ft x 6 ft", trimWidthIn: 72, trimHeightIn: 12, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2x3", label: "Vinyl Banner 2 ft x 3 ft", trimWidthIn: 36, trimHeightIn: 24, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-1x7", label: "Vinyl Banner 1 ft x 7 ft", trimWidthIn: 84, trimHeightIn: 12, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-1x8", label: "Vinyl Banner 1 ft x 8 ft", trimWidthIn: 96, trimHeightIn: 12, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2x4", label: "Vinyl Banner 2 ft x 4 ft", trimWidthIn: 48, trimHeightIn: 24, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-1x9", label: "Vinyl Banner 1 ft x 9 ft", trimWidthIn: 108, trimHeightIn: 12, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-3x3", label: "Vinyl Banner 3 ft x 3 ft", trimWidthIn: 36, trimHeightIn: 36, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2_4x4", label: "Vinyl Banner 2.4 ft x 4 ft", trimWidthIn: 48, trimHeightIn: 28.8, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-1x10", label: "Vinyl Banner 1 ft x 10 ft", trimWidthIn: 120, trimHeightIn: 12, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2x5", label: "Vinyl Banner 2 ft x 5 ft", trimWidthIn: 60, trimHeightIn: 24, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-1x11", label: "Vinyl Banner 1 ft x 11 ft", trimWidthIn: 132, trimHeightIn: 12, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-1x12", label: "Vinyl Banner 1 ft x 12 ft", trimWidthIn: 144, trimHeightIn: 12, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2x6", label: "Vinyl Banner 2 ft x 6 ft", trimWidthIn: 72, trimHeightIn: 24, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-3x4", label: "Vinyl Banner 3 ft x 4 ft", trimWidthIn: 48, trimHeightIn: 36, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-1x13", label: "Vinyl Banner 1 ft x 13 ft", trimWidthIn: 156, trimHeightIn: 12, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-1x14", label: "Vinyl Banner 1 ft x 14 ft", trimWidthIn: 168, trimHeightIn: 12, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2x7", label: "Vinyl Banner 2 ft x 7 ft", trimWidthIn: 84, trimHeightIn: 24, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-1x15", label: "Vinyl Banner 1 ft x 15 ft", trimWidthIn: 180, trimHeightIn: 12, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2_5x6", label: "Vinyl Banner 2.5 ft x 6 ft", trimWidthIn: 72, trimHeightIn: 30, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-3x5", label: "Vinyl Banner 3 ft x 5 ft", trimWidthIn: 60, trimHeightIn: 36, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-1x16", label: "Vinyl Banner 1 ft x 16 ft", trimWidthIn: 192, trimHeightIn: 12, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2x8", label: "Vinyl Banner 2 ft x 8 ft", trimWidthIn: 96, trimHeightIn: 24, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-4x4", label: "Vinyl Banner 4 ft x 4 ft", trimWidthIn: 48, trimHeightIn: 48, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-1x17", label: "Vinyl Banner 1 ft x 17 ft", trimWidthIn: 204, trimHeightIn: 12, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-1x18", label: "Vinyl Banner 1 ft x 18 ft", trimWidthIn: 216, trimHeightIn: 12, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2x9", label: "Vinyl Banner 2 ft x 9 ft", trimWidthIn: 108, trimHeightIn: 24, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-3x6", label: "Vinyl Banner 3 ft x 6 ft", trimWidthIn: 72, trimHeightIn: 36, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-1x19", label: "Vinyl Banner 1 ft x 19 ft", trimWidthIn: 228, trimHeightIn: 12, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-1x20", label: "Vinyl Banner 1 ft x 20 ft", trimWidthIn: 240, trimHeightIn: 12, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2x10", label: "Vinyl Banner 2 ft x 10 ft", trimWidthIn: 120, trimHeightIn: 24, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2_5x8", label: "Vinyl Banner 2.5 ft x 8 ft", trimWidthIn: 96, trimHeightIn: 30, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-4x5", label: "Vinyl Banner 4 ft x 5 ft", trimWidthIn: 60, trimHeightIn: 48, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-3x7", label: "Vinyl Banner 3 ft x 7 ft", trimWidthIn: 84, trimHeightIn: 36, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2x11", label: "Vinyl Banner 2 ft x 11 ft", trimWidthIn: 132, trimHeightIn: 24, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2x12", label: "Vinyl Banner 2 ft x 12 ft", trimWidthIn: 144, trimHeightIn: 24, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-3x8", label: "Vinyl Banner 3 ft x 8 ft", trimWidthIn: 96, trimHeightIn: 36, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-4x6", label: "Vinyl Banner 4 ft x 6 ft", trimWidthIn: 72, trimHeightIn: 48, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2_5x10", label: "Vinyl Banner 2.5 ft x 10 ft", trimWidthIn: 120, trimHeightIn: 30, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-5x5", label: "Vinyl Banner 5 ft x 5 ft", trimWidthIn: 60, trimHeightIn: 60, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2x13", label: "Vinyl Banner 2 ft x 13 ft", trimWidthIn: 156, trimHeightIn: 24, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-3x9", label: "Vinyl Banner 3 ft x 9 ft", trimWidthIn: 108, trimHeightIn: 36, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2x14", label: "Vinyl Banner 2 ft x 14 ft", trimWidthIn: 168, trimHeightIn: 24, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-4x7", label: "Vinyl Banner 4 ft x 7 ft", trimWidthIn: 84, trimHeightIn: 48, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2x15", label: "Vinyl Banner 2 ft x 15 ft", trimWidthIn: 180, trimHeightIn: 24, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2_5x12", label: "Vinyl Banner 2.5 ft x 12 ft", trimWidthIn: 144, trimHeightIn: 30, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-3x10", label: "Vinyl Banner 3 ft x 10 ft", trimWidthIn: 120, trimHeightIn: 36, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-5x6", label: "Vinyl Banner 5 ft x 6 ft", trimWidthIn: 72, trimHeightIn: 60, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2x16", label: "Vinyl Banner 2 ft x 16 ft", trimWidthIn: 192, trimHeightIn: 24, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-4x8", label: "Vinyl Banner 4 ft x 8 ft", trimWidthIn: 96, trimHeightIn: 48, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-3x11", label: "Vinyl Banner 3 ft x 11 ft", trimWidthIn: 132, trimHeightIn: 36, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2x17", label: "Vinyl Banner 2 ft x 17 ft", trimWidthIn: 204, trimHeightIn: 24, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-5x7", label: "Vinyl Banner 5 ft x 7 ft", trimWidthIn: 84, trimHeightIn: 60, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2x18", label: "Vinyl Banner 2 ft x 18 ft", trimWidthIn: 216, trimHeightIn: 24, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-3x12", label: "Vinyl Banner 3 ft x 12 ft", trimWidthIn: 144, trimHeightIn: 36, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-4x9", label: "Vinyl Banner 4 ft x 9 ft", trimWidthIn: 108, trimHeightIn: 48, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-6x6", label: "Vinyl Banner 6 ft x 6 ft", trimWidthIn: 72, trimHeightIn: 72, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2x19", label: "Vinyl Banner 2 ft x 19 ft", trimWidthIn: 228, trimHeightIn: 24, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-3x13", label: "Vinyl Banner 3 ft x 13 ft", trimWidthIn: 156, trimHeightIn: 36, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-2x20", label: "Vinyl Banner 2 ft x 20 ft", trimWidthIn: 240, trimHeightIn: 24, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-4x10", label: "Vinyl Banner 4 ft x 10 ft", trimWidthIn: 120, trimHeightIn: 48, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-5x8", label: "Vinyl Banner 5 ft x 8 ft", trimWidthIn: 96, trimHeightIn: 60, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-3x14", label: "Vinyl Banner 3 ft x 14 ft", trimWidthIn: 168, trimHeightIn: 36, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-6x7", label: "Vinyl Banner 6 ft x 7 ft", trimWidthIn: 84, trimHeightIn: 72, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-4x11", label: "Vinyl Banner 4 ft x 11 ft", trimWidthIn: 132, trimHeightIn: 48, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-3x15", label: "Vinyl Banner 3 ft x 15 ft", trimWidthIn: 180, trimHeightIn: 36, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-5x9", label: "Vinyl Banner 5 ft x 9 ft", trimWidthIn: 108, trimHeightIn: 60, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-3x16", label: "Vinyl Banner 3 ft x 16 ft", trimWidthIn: 192, trimHeightIn: 36, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-4x12", label: "Vinyl Banner 4 ft x 12 ft", trimWidthIn: 144, trimHeightIn: 48, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-6x8", label: "Vinyl Banner 6 ft x 8 ft", trimWidthIn: 96, trimHeightIn: 72, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-5x10", label: "Vinyl Banner 5 ft x 10 ft", trimWidthIn: 120, trimHeightIn: 60, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-3x17", label: "Vinyl Banner 3 ft x 17 ft", trimWidthIn: 204, trimHeightIn: 36, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-4x13", label: "Vinyl Banner 4 ft x 13 ft", trimWidthIn: 156, trimHeightIn: 48, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-3x18", label: "Vinyl Banner 3 ft x 18 ft", trimWidthIn: 216, trimHeightIn: 36, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-6x9", label: "Vinyl Banner 6 ft x 9 ft", trimWidthIn: 108, trimHeightIn: 72, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-5x11", label: "Vinyl Banner 5 ft x 11 ft", trimWidthIn: 132, trimHeightIn: 60, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-4x14", label: "Vinyl Banner 4 ft x 14 ft", trimWidthIn: 168, trimHeightIn: 48, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-3x19", label: "Vinyl Banner 3 ft x 19 ft", trimWidthIn: 228, trimHeightIn: 36, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-3x20", label: "Vinyl Banner 3 ft x 20 ft", trimWidthIn: 240, trimHeightIn: 36, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-4x15", label: "Vinyl Banner 4 ft x 15 ft", trimWidthIn: 180, trimHeightIn: 48, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-5x12", label: "Vinyl Banner 5 ft x 12 ft", trimWidthIn: 144, trimHeightIn: 60, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-6x10", label: "Vinyl Banner 6 ft x 10 ft", trimWidthIn: 120, trimHeightIn: 72, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-4x16", label: "Vinyl Banner 4 ft x 16 ft", trimWidthIn: 192, trimHeightIn: 48, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-5x13", label: "Vinyl Banner 5 ft x 13 ft", trimWidthIn: 156, trimHeightIn: 60, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-6x11", label: "Vinyl Banner 6 ft x 11 ft", trimWidthIn: 132, trimHeightIn: 72, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-4x17", label: "Vinyl Banner 4 ft x 17 ft", trimWidthIn: 204, trimHeightIn: 48, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-5x14", label: "Vinyl Banner 5 ft x 14 ft", trimWidthIn: 168, trimHeightIn: 60, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-4x18", label: "Vinyl Banner 4 ft x 18 ft", trimWidthIn: 216, trimHeightIn: 48, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-6x12", label: "Vinyl Banner 6 ft x 12 ft", trimWidthIn: 144, trimHeightIn: 72, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-5x15", label: "Vinyl Banner 5 ft x 15 ft", trimWidthIn: 180, trimHeightIn: 60, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-4x19", label: "Vinyl Banner 4 ft x 19 ft", trimWidthIn: 228, trimHeightIn: 48, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-6x13", label: "Vinyl Banner 6 ft x 13 ft", trimWidthIn: 156, trimHeightIn: 72, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-4x20", label: "Vinyl Banner 4 ft x 20 ft", trimWidthIn: 240, trimHeightIn: 48, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-5x16", label: "Vinyl Banner 5 ft x 16 ft", trimWidthIn: 192, trimHeightIn: 60, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-6x14", label: "Vinyl Banner 6 ft x 14 ft", trimWidthIn: 168, trimHeightIn: 72, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-5x17", label: "Vinyl Banner 5 ft x 17 ft", trimWidthIn: 204, trimHeightIn: 60, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-5x18", label: "Vinyl Banner 5 ft x 18 ft", trimWidthIn: 216, trimHeightIn: 60, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-6x15", label: "Vinyl Banner 6 ft x 15 ft", trimWidthIn: 180, trimHeightIn: 72, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-5x19", label: "Vinyl Banner 5 ft x 19 ft", trimWidthIn: 228, trimHeightIn: 60, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-6x16", label: "Vinyl Banner 6 ft x 16 ft", trimWidthIn: 192, trimHeightIn: 72, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-5x20", label: "Vinyl Banner 5 ft x 20 ft", trimWidthIn: 240, trimHeightIn: 60, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-6x17", label: "Vinyl Banner 6 ft x 17 ft", trimWidthIn: 204, trimHeightIn: 72, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-6x18", label: "Vinyl Banner 6 ft x 18 ft", trimWidthIn: 216, trimHeightIn: 72, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-6x19", label: "Vinyl Banner 6 ft x 19 ft", trimWidthIn: 228, trimHeightIn: 72, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
  { key: "vinyl-6x20", label: "Vinyl Banner 6 ft x 20 ft", trimWidthIn: 240, trimHeightIn: 72, bleedIn: 0.125, safeZoneInsetIn: 0.25 },
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

/**
 * Deliberately deleted rather than corrected.
 *
 * This listed Acrylic, which the shop has never sold, and nothing referenced it - so it was a
 * plausible-looking constant waiting for someone to wire it into a page. The real list lives in
 * RIGID_MATERIALS in lib/pricing/rigid-signs.ts, next to the prices that prove it.
 */

/**
 * Window graphic sizes you can design on, which are all sizes you can actually buy.
 *
 * Every entry here is a real trim from lib/pricing/window-decals-catalogue - the storefront's own
 * 117-size catalogue, not a hand-picked set - so a design made in the studio always maps onto
 * something orderable. A test asserts each of these is sellable, the same check that keeps the
 * banner presets honest.
 *
 * The list is a working subset rather than all 117: fifty rectangle sizes in a dropdown is a worse
 * experience than a dozen covering the shapes and proportions people actually ask for. Landscape
 * banners across the top of a window, portrait panels beside a door, and the die-cut shapes, each
 * at its one or two available sizes.
 *
 * The die-cut shapes design on a plain rectangle of the bounding size and have the shape applied as
 * a clip mask at render/export time (lib/business-card/shape-paths.ts), exactly as rigid signs do.
 */
export const WINDOW_DECAL_SIZES: SizePreset[] = [
  { key: "banner-24x6", label: "Window Banner 24 x 6 in", trimWidthIn: 23.875, trimHeightIn: 5.875, bleedIn: 0.125, safeZoneInsetIn: 0.5 },
  { key: "banner-24x9", label: "Window Banner 24 x 9 in", trimWidthIn: 23.875, trimHeightIn: 8.875, bleedIn: 0.125, safeZoneInsetIn: 0.5 },
  { key: "banner-36x18", label: "Window Banner 36 x 18 in", trimWidthIn: 35.875, trimHeightIn: 17.875, bleedIn: 0.125, safeZoneInsetIn: 0.5 },
  { key: "landscape-24x18", label: "Landscape 24 x 18 in", trimWidthIn: 23.875, trimHeightIn: 17.875, bleedIn: 0.125, safeZoneInsetIn: 0.5 },
  { key: "landscape-36x24", label: "Landscape 36 x 24 in", trimWidthIn: 35.875, trimHeightIn: 23.875, bleedIn: 0.125, safeZoneInsetIn: 0.5 },
  { key: "landscape-48x36", label: "Landscape 48 x 36 in", trimWidthIn: 47.875, trimHeightIn: 35.875, bleedIn: 0.125, safeZoneInsetIn: 0.5 },
  { key: "portrait-11x17", label: "Portrait 11 x 17 in", trimWidthIn: 10.875, trimHeightIn: 16.875, bleedIn: 0.125, safeZoneInsetIn: 0.5 },
  { key: "portrait-18x24", label: "Portrait 18 x 24 in", trimWidthIn: 17.875, trimHeightIn: 23.875, bleedIn: 0.125, safeZoneInsetIn: 0.5 },
  { key: "portrait-24x36", label: "Portrait 24 x 36 in", trimWidthIn: 23.875, trimHeightIn: 35.875, bleedIn: 0.125, safeZoneInsetIn: 0.5 },
  { key: "portrait-6x24", label: "Door Panel 6 x 24 in", trimWidthIn: 5.875, trimHeightIn: 23.875, bleedIn: 0.125, safeZoneInsetIn: 0.5 },
  { key: "square-24", label: "Square 24 x 24 in", trimWidthIn: 23.875, trimHeightIn: 23.875, bleedIn: 0.125, safeZoneInsetIn: 0.5 },
  { key: "circle-24", label: "Circle 24 in diameter", trimWidthIn: 23.875, trimHeightIn: 23.875, bleedIn: 0.125, safeZoneInsetIn: 0.75 },
  { key: "octagon-23", label: "Octagon 23 in", trimWidthIn: 22.875, trimHeightIn: 22.875, bleedIn: 0.125, safeZoneInsetIn: 0.75 },
  { key: "star-23x22", label: "Star 23 x 22 in", trimWidthIn: 22.875, trimHeightIn: 21.875, bleedIn: 0.125, safeZoneInsetIn: 0.75 },
  { key: "arrow-24x18", label: "Arrow 24 x 18 in", trimWidthIn: 23.6875, trimHeightIn: 17.75, bleedIn: 0.125, safeZoneInsetIn: 0.75 },
];

export function sizePresetsFor(product: DesignProduct): SizePreset[] {
  if (product === "postcard") return POSTCARD_SIZES;
  if (product === "banner") return BANNER_SIZES;
  if (product === "rigid-sign") return RIGID_SIGN_SIZES;
  if (product === "window-decal") return WINDOW_DECAL_SIZES;
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
  "window-decal": "window-decals",
};

/** Matches the Prisma DesignProduct enum values (kept as plain strings here so this file has no
 * dependency on the generated Prisma client). */
export const PRODUCT_DB_VALUE: Record<DesignProduct, "BUSINESS_CARD" | "POSTCARD" | "BANNER" | "RIGID_SIGN" | "WINDOW_DECAL"> = {
  "business-card": "BUSINESS_CARD",
  postcard: "POSTCARD",
  banner: "BANNER",
  "rigid-sign": "RIGID_SIGN",
  "window-decal": "WINDOW_DECAL",
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

/**
 * Whether the chosen print option puts anything on the reverse.
 *
 * GotPrint colour ids: 1 is front only, 2 is a grayscale back, 3 is full colour both sides. Ids 2
 * and 3 both print a second face, so both need their own artwork file and their own approval - a
 * grayscale back is still a back.
 */
export function needsBackArtwork(colorId: number): boolean {
  return colorId === 2 || colorId === 3;
}

/** What to call the second upload, so the customer supplies the right kind of file. */
export function backArtworkLabel(colorId: number): string {
  if (colorId === 2) return "Back (grayscale)";
  if (colorId === 3) return "Back (full colour)";
  return "Back";
}
