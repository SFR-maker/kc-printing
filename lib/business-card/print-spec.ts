export const DPI = 300;

export const PRINT_SPEC = {
  trimWidthIn: 3.5,
  trimHeightIn: 2,
  bleedIn: 0.125,
  safeZoneInsetIn: 0.125,
  dpi: DPI,
} as const;

export const BLEED_WIDTH_IN = PRINT_SPEC.trimWidthIn + PRINT_SPEC.bleedIn * 2;
export const BLEED_HEIGHT_IN = PRINT_SPEC.trimHeightIn + PRINT_SPEC.bleedIn * 2;

export const BLEED_PX_WIDTH = Math.round(BLEED_WIDTH_IN * DPI);
export const BLEED_PX_HEIGHT = Math.round(BLEED_HEIGHT_IN * DPI);
export const TRIM_PX_WIDTH = Math.round(PRINT_SPEC.trimWidthIn * DPI);
export const TRIM_PX_HEIGHT = Math.round(PRINT_SPEC.trimHeightIn * DPI);
export const BLEED_PX_INSET = Math.round(PRINT_SPEC.bleedIn * DPI);
export const SAFE_ZONE_PX_INSET = BLEED_PX_INSET + Math.round(PRINT_SPEC.safeZoneInsetIn * DPI);

export const MIN_PRINT_DPI = 150;
export const RECOMMENDED_DPI = 300;
export const MIN_FONT_SIZE_PT = 6;

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
