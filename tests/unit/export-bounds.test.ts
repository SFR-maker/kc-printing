import { describe, it, expect } from "vitest";
import { effectiveExportDpi, MAX_EXPORT_PIXELS } from "@/lib/business-card/export";
import { CardSideSchema } from "@/lib/business-card/schema";
import { DPI, MAX_PHYSICAL_IN } from "@/lib/business-card/print-spec";

/**
 * How large an export is allowed to get.
 *
 * 300 DPI is correct for a business card and ruinous for a banner. The largest product this shop
 * sells is 6ft x 20ft; at 300 DPI that is 21,600 x 72,000 - 1.56 billion pixels, roughly 5.8 GB in
 * libvips. So PNG export of a real, orderable product did not merely run slowly, it exhausted the
 * function's memory and died, and no amount of validating the *input* would have helped because the
 * input was entirely legitimate.
 *
 * Two separate limits, doing two different jobs, and it is worth keeping them straight:
 *   - effectiveExportDpi lowers the resolution for sizes that are real but enormous.
 *   - the schema bound rejects sizes no product comes in at all, since those arrive from an
 *     unauthenticated endpoint and decide how much memory gets allocated.
 */

const px = (w: number, h: number) => w * effectiveExportDpi(w, h) * h * effectiveExportDpi(w, h);

describe("export resolution", () => {
  it("leaves small formats at the full 300 DPI", () => {
    // Everything up to roughly 30in square still fits the budget, so the products customers
    // actually buy most of are completely unaffected.
    for (const [w, h, label] of [
      [3.75, 2.25, "business card"],
      [6.25, 4.25, "postcard"],
      [24, 36, "rigid sign"],
      [24, 6, "window decal"],
    ] as const) {
      expect(effectiveExportDpi(w, h), label).toBe(DPI);
    }
  });

  it("scales down the largest banner instead of dying on it", () => {
    // 6ft x 20ft: the case that OOM'd.
    const dpi = effectiveExportDpi(72, 240);
    expect(dpi).toBeGreaterThan(0);
    expect(dpi).toBeLessThan(DPI);
    expect(px(72, 240)).toBeLessThanOrEqual(MAX_EXPORT_PIXELS);
  });

  it("never exceeds the pixel budget at any size the schema permits", () => {
    for (let side = 1; side <= MAX_PHYSICAL_IN; side += 7) {
      expect(px(side, side), `${side}in square`).toBeLessThanOrEqual(MAX_EXPORT_PIXELS);
      expect(px(side, MAX_PHYSICAL_IN), `${side}x${MAX_PHYSICAL_IN}`).toBeLessThanOrEqual(MAX_EXPORT_PIXELS);
    }
  });

  it("keeps a large banner sharp enough for its viewing distance", () => {
    // Not a print-quality claim for small format - it is a floor against the clamp collapsing to
    // something absurd. Commercial large-format runs well under 100 DPI at full size.
    expect(effectiveExportDpi(72, 240)).toBeGreaterThanOrEqual(60);
  });

  it("returns something usable for degenerate input rather than 0 or NaN", () => {
    for (const [w, h] of [[0, 0], [-1, 5], [Number.NaN, 10]] as const) {
      const dpi = effectiveExportDpi(w, h);
      expect(Number.isFinite(dpi), `${w}x${h}`).toBe(true);
      expect(dpi, `${w}x${h}`).toBeGreaterThan(0);
    }
  });
});

describe("physical size bounds", () => {
  const side = (w: number, h: number) =>
    CardSideSchema.safeParse({
      physicalWidthIn: w,
      physicalHeightIn: h,
      background: { type: "solid", color: "#FFFFFF", gradient: null },
      elements: [],
    });

  it("accepts every size the shop actually sells", () => {
    for (const [w, h, label] of [
      [3.75, 2.25, "business card"],
      [72, 240, "6ft x 20ft banner"],
      [24, 36, "rigid sign"],
    ] as const) {
      expect(side(w, h).success, label).toBe(true);
    }
  });

  it("refuses a size no product comes in", () => {
    // The shape of the original problem: one cheap request claiming an enormous canvas.
    expect(side(6000, 6000).success).toBe(false);
    expect(side(MAX_PHYSICAL_IN + 1, 10).success).toBe(false);
  });

  it("still refuses zero and negative sides", () => {
    expect(side(0, 10).success).toBe(false);
    expect(side(10, -5).success).toBe(false);
  });
});
