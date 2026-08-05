import { describe, it, expect } from "vitest";
import { parseTrimSize } from "@/lib/print/spec";
import { BANNER_SIZES } from "@/lib/pricing/banners";
import { POSTCARD_SIZES } from "@/lib/pricing/postcards";

/**
 * The AI background is generated at the aspect ratio of the piece it will print on, and anything
 * outside that shape is cover-cropped away. Previously a postcard was always composed 3:2 and a
 * banner 2:1, so a 6 x 11in postcard or a 4 x 4ft banner lost most of what the model produced.
 *
 * The size the customer picks reaches the API as inches, parsed from the catalogue label. If a
 * label fails to parse the request silently falls back to the product's default shape - which is
 * the old bug wearing a different hat - so every offered label has to parse.
 */

const LONG_EDGE_PX: Record<string, number> = { "business-card": 1500, postcard: 1800, banner: 9000 };

/** Mirrors targetRaster in app/api/ai-design/route.ts. */
function targetRaster(product: string, widthIn: number, heightIn: number) {
  const longEdge = LONG_EDGE_PX[product];
  const ratio = widthIn / heightIn;
  return ratio >= 1
    ? { w: longEdge, h: Math.max(1, Math.round(longEdge / ratio)) }
    : { w: Math.max(1, Math.round(longEdge * ratio)), h: longEdge };
}

describe("every size the picker offers parses to real inches", () => {
  it("parses all banner sizes", () => {
    for (const s of BANNER_SIZES) {
      const trim = parseTrimSize(s.label);
      expect(trim, `banner size "${s.label}" did not parse`).not.toBeNull();
      expect(trim!.widthIn).toBeGreaterThan(0);
      expect(trim!.heightIn).toBeGreaterThan(0);
    }
  });

  it("parses all postcard sizes, including the labelled Standard", () => {
    for (const s of POSTCARD_SIZES) {
      const trim = parseTrimSize(s.label);
      expect(trim, `postcard size "${s.label}" did not parse`).not.toBeNull();
    }
    // '4" x 6" (Standard)' carries a suffix the parser has to ignore rather than choke on.
    expect(parseTrimSize('4" x 6" (Standard)')).toEqual({ widthIn: 4, heightIn: 6 });
  });
});

describe("the generated raster matches the piece", () => {
  it("matches the aspect ratio of every banner size on offer", () => {
    for (const s of BANNER_SIZES) {
      const t = parseTrimSize(s.label)!;
      const r = targetRaster("banner", t.widthIn, t.heightIn);
      expect(Math.abs(r.w / r.h - t.widthIn / t.heightIn), s.label).toBeLessThan(0.01);
    }
  });

  it("matches the aspect ratio of every postcard size on offer", () => {
    for (const s of POSTCARD_SIZES) {
      const t = parseTrimSize(s.label)!;
      const r = targetRaster("postcard", t.widthIn, t.heightIn);
      expect(Math.abs(r.w / r.h - t.widthIn / t.heightIn), s.label).toBeLessThan(0.01);
    }
  });

  it("generates a square banner square, not wide-then-cropped", () => {
    // The old code produced 16000x8000 for every vinyl banner. A 4x4ft banner then had half the
    // image thrown away by the cover crop.
    const r = targetRaster("banner", 48, 48);
    expect(r.w).toBe(r.h);
  });

  it("generates a tall postcard tall", () => {
    const r = targetRaster("postcard", 6, 11);
    expect(r.h).toBeGreaterThan(r.w);
  });

  it("keeps the long edge within its product's budget", () => {
    for (const [product, sizes] of [["banner", BANNER_SIZES], ["postcard", POSTCARD_SIZES]] as const) {
      for (const s of sizes) {
        const t = parseTrimSize(s.label)!;
        const r = targetRaster(product, t.widthIn, t.heightIn);
        expect(Math.max(r.w, r.h)).toBe(LONG_EDGE_PX[product]);
      }
    }
  });
});
