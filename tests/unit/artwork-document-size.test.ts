import { describe, it, expect } from "vitest";
import { printSpec, docSize, parseTrimSize } from "@/lib/print/spec";
import { POSTCARD_SIZES } from "@/lib/pricing/postcards";
import { BANNER_SIZES } from "@/lib/pricing/banners";

/**
 * The document an uploaded file is measured against is the finished size plus that product's bleed.
 *
 * The inspect endpoint defaults `product` to business cards when the caller does not say otherwise,
 * and the artwork step was not saying otherwise - so every postcard, banner and rigid sign was
 * measured against a 3.6 x 2.1in business card. The proof drew the wrong trim and safe zone, the
 * fit placed the artwork against the wrong geometry, and the resolution check ran on the wrong
 * placed size. A 4 x 6in postcard reported "we've fitted it to the required 3.6 x 2.1 in".
 */

describe("each product measures against its own document", () => {
  it("gives a business card 0.05in of bleed", () => {
    expect(docSize(printSpec("business-cards", 3.5, 2))).toEqual({ widthIn: 3.6, heightIn: 2.1 });
  });

  it("gives a 4 x 6in postcard a 4.25 x 6.25in document, not a business card's", () => {
    const doc = docSize(printSpec("postcards", 4, 6));
    expect(doc).toEqual({ widthIn: 4.25, heightIn: 6.25 });
    expect(doc.widthIn).not.toBe(3.6);
  });

  it("scales with the size chosen rather than a fixed default", () => {
    expect(docSize(printSpec("postcards", 6, 11))).toEqual({ widthIn: 6.25, heightIn: 11.25 });
    expect(docSize(printSpec("banners", 36, 72))).toEqual({ widthIn: 36.25, heightIn: 72.25 });
    expect(docSize(printSpec("rigid-signs", 18, 24))).toEqual({ widthIn: 18.25, heightIn: 24.25 });
  });

  it("never returns a business card document for another product", () => {
    // The exact symptom: a non-card product reporting the card's document.
    for (const [product, w, h] of [
      ["postcards", 4, 6], ["banners", 36, 72], ["rigid-signs", 18, 24],
    ] as const) {
      const doc = docSize(printSpec(product, w, h));
      expect(`${doc.widthIn}x${doc.heightIn}`, product).not.toBe("3.6x2.1");
    }
  });
});

describe("every size the builder offers produces a sane document", () => {
  it("covers all postcard sizes", () => {
    for (const s of POSTCARD_SIZES) {
      const trim = parseTrimSize(s.label);
      expect(trim, s.label).not.toBeNull();
      const doc = docSize(printSpec("postcards", trim!.widthIn, trim!.heightIn));
      expect(doc.widthIn).toBeCloseTo(trim!.widthIn + 0.25, 5);
      expect(doc.heightIn).toBeCloseTo(trim!.heightIn + 0.25, 5);
    }
  });

  it("covers all banner sizes", () => {
    for (const s of BANNER_SIZES) {
      const trim = parseTrimSize(s.label);
      expect(trim, s.label).not.toBeNull();
      const doc = docSize(printSpec("banners", trim!.widthIn, trim!.heightIn));
      expect(doc.widthIn).toBeGreaterThan(trim!.widthIn);
      expect(doc.heightIn).toBeGreaterThan(trim!.heightIn);
    }
  });
});
