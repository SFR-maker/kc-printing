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
  it("computes bleed size as trim plus bleed on both sides", () => {
    expect(BLEED_WIDTH_IN).toBeCloseTo(3.75, 5);
    expect(BLEED_HEIGHT_IN).toBeCloseTo(2.25, 5);
  });

  it("computes full-bleed raster dimensions at 300 DPI", () => {
    expect(BLEED_PX_WIDTH).toBe(1125);
    expect(BLEED_PX_HEIGHT).toBe(675);
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
