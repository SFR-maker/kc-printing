import { describe, it, expect } from "vitest";
import {
  businessCardParcel, caliperIn, cardStackWeightOz, cardWeightOz,
  formatWeight, parcelForProduct, trimSizeIn,
} from "@/lib/shipping/parcel";

const STANDARD = 101; // 2" x 3.5" US standard
const MATTE_100LB = 7;
const GLOSS_14 = 1;
const MATTE_16 = 10;
const UNCOATED_14 = 2;
const TRIFECTA_38 = 32;

describe("caliper parsing", () => {
  it("reads the caliper out of the stock name", () => {
    expect(caliperIn(MATTE_16)).toBeCloseTo(0.016, 4);
    expect(caliperIn(TRIFECTA_38)).toBeCloseTo(0.038, 4);
  });

  it("knows the one stock named by basis weight instead of caliper", () => {
    // GotPrint's paper table gives "Matte Cover, 10 pt., 100 lb."
    expect(caliperIn(MATTE_100LB)).toBeCloseTo(0.010, 4);
  });
});

describe("trim size parsing", () => {
  it("normalises to long edge first, since orientation does not change mass", () => {
    expect(trimSizeIn(101)).toEqual({ widthIn: 3.5, heightIn: 2 }); // horizontal
    expect(trimSizeIn(102)).toEqual({ widthIn: 3.5, heightIn: 2 }); // vertical
  });
});

describe("card weight", () => {
  /**
   * The calibration point. 100 lb cover is 271 gsm by the standard basis-size conversion, and a
   * 2 x 3.5 in card is 0.004516 m2, so one card must weigh about 1.22 g. If this test fails the
   * density constants have drifted away from the one figure GotPrint actually publishes.
   */
  it("matches the published 100 lb / 10 pt stock to within a few percent", () => {
    const grams = cardWeightOz(STANDARD, MATTE_100LB) * 28.3495;
    expect(grams).toBeGreaterThan(1.15);
    expect(grams).toBeLessThan(1.30);
  });

  it("makes thicker stock heavier", () => {
    expect(cardWeightOz(STANDARD, MATTE_16)).toBeGreaterThan(cardWeightOz(STANDARD, GLOSS_14));
    expect(cardWeightOz(STANDARD, TRIFECTA_38)).toBeGreaterThan(cardWeightOz(STANDARD, MATTE_16));
  });

  it("makes uncoated lighter than coated at the same caliper, since it has no clay filling it", () => {
    expect(cardWeightOz(STANDARD, UNCOATED_14)).toBeLessThan(cardWeightOz(STANDARD, GLOSS_14));
  });

  it("scales linearly with quantity", () => {
    const one = cardWeightOz(STANDARD, MATTE_16);
    expect(cardStackWeightOz(STANDARD, MATTE_16, 500)).toBeCloseTo(one * 500, 5);
  });
});

describe("parcel", () => {
  it("always weighs more than the cards alone — boxes and packing are real weight", () => {
    const cards = cardStackWeightOz(STANDARD, MATTE_16, 500);
    expect(businessCardParcel(STANDARD, MATTE_16, 500).weightOz).toBeGreaterThan(cards);
  });

  it("lands a 500-card run in the range a real box of cards weighs", () => {
    // Industry rule of thumb: 500 standard business cards run 1.5 to 3 lb boxed.
    const oz = businessCardParcel(STANDARD, MATTE_16, 500).weightOz;
    expect(oz).toBeGreaterThan(16 * 1.5);
    expect(oz).toBeLessThan(16 * 3.5);
  });

  it("stacks large runs into a compact carton rather than a long flat one", () => {
    // 5,000 cards laid out as a single layer produced a 29in carton, straight into oversize
    // surcharges. Length plus girth must stay under the 108in the major carriers allow.
    const p = businessCardParcel(STANDARD, MATTE_16, 5000);
    const girth = 2 * (p.widthIn + p.heightIn) + p.lengthIn;
    expect(girth).toBeLessThan(108);
    expect(p.lengthIn).toBeLessThan(20);
  });

  it("grows with quantity in every dimension of the total", () => {
    const small = businessCardParcel(STANDARD, MATTE_16, 250);
    const large = businessCardParcel(STANDARD, MATTE_16, 2500);
    expect(large.weightOz).toBeGreaterThan(small.weightOz);
  });

  it("never quotes a zero or negative parcel", () => {
    for (const q of [25, 100, 1000, 100000]) {
      const p = businessCardParcel(STANDARD, MATTE_16, q);
      expect(p.weightOz).toBeGreaterThan(0);
      expect(Math.min(p.lengthIn, p.widthIn, p.heightIn)).toBeGreaterThan(0);
    }
  });
});

describe("parcelForProduct", () => {
  it("models business cards", () => {
    expect(parcelForProduct("business-cards", { sizeId: STANDARD, paperId: MATTE_16, quantity: 250 })).not.toBeNull();
  });

  it("returns null for products with no weight model, so callers fall back to flat rates", () => {
    // Quoting a live carrier rate from an invented parcel charges a real number for a guess.
    expect(parcelForProduct("postcards", { sizeId: 1, paperId: 1, quantity: 500 })).toBeNull();
    expect(parcelForProduct("banners", null)).toBeNull();
    expect(parcelForProduct("business-cards", null)).toBeNull();
  });
});

describe("formatWeight", () => {
  it("reads as pounds and ounces", () => {
    expect(formatWeight(8)).toBe("8 oz");
    expect(formatWeight(16)).toBe("1 lb 0 oz");
    expect(formatWeight(25.6)).toBe("1 lb 9.6 oz");
  });
});
