import { describe, it, expect } from "vitest";
import {
  BLEED_PX_HEIGHT,
  BLEED_PX_WIDTH,
  TRIM_PX_WIDTH,
  TRIM_PX_HEIGHT,
  BLEED_WIDTH_IN,
  BLEED_HEIGHT_IN,
  inchesToPx,
  pxToInches,
  effectiveImageDpi,
} from "@/lib/business-card/print-spec";

describe("print spec constants", () => {
  // House spec is a 0.05in bleed, so the full-bleed business-card document is 3.6 x 2.1 and trims
  // to 3.5 x 2. Customer uploads are validated against these same numbers.
  it("computes bleed size as trim plus bleed on both sides", () => {
    expect(BLEED_WIDTH_IN).toBeCloseTo(3.6, 5);
    expect(BLEED_HEIGHT_IN).toBeCloseTo(2.1, 5);
  });

  it("computes full-bleed raster dimensions at 300 DPI", () => {
    expect(BLEED_PX_WIDTH).toBe(1080);
    expect(BLEED_PX_HEIGHT).toBe(630);
  });

  it("computes trim raster dimensions at 300 DPI", () => {
    expect(TRIM_PX_WIDTH).toBe(1050);
    expect(TRIM_PX_HEIGHT).toBe(600);
  });

  it("round-trips inches and pixels", () => {
    expect(inchesToPx(1, 300)).toBe(300);
    expect(pxToInches(300, 300)).toBe(1);
  });

  it("computes effective image DPI from natural width and rendered inches", () => {
    expect(effectiveImageDpi(900, 3)).toBe(300);
    expect(effectiveImageDpi(300, 3)).toBe(100);
  });
});
