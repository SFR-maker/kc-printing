import { describe, it, expect } from "vitest";
import {
  POSTCARD_COLORS, POSTCARD_PAPERS, POSTCARD_SIZES,
  areaSqIn, availableColors, availableQuantities, calculatePostcardPrice, isComboAvailable,
} from "@/lib/pricing/postcards";

const STD = '4" x 6" (Standard)';
const GLOSS = "14 pt. Gloss";
const FRONT = "Full Color Front, No Back";
const GRAYSCALE = "Full Color Front, Grayscale Back";
const TRIFECTA = "38 pt. Trifecta Black";

describe("catalogue", () => {
  it("offers the sizes, papers and print options that were priced", () => {
    expect(POSTCARD_SIZES.length).toBeGreaterThanOrEqual(7);
    expect(POSTCARD_PAPERS.length).toBe(12);
    expect(POSTCARD_COLORS.map((c) => c.label)).toContain(GRAYSCALE);
  });

  it("orders sizes small to large", () => {
    const areas = POSTCARD_SIZES.map((s) => areaSqIn(s.label));
    expect([...areas].sort((a, b) => a - b)).toEqual(areas);
  });
});

describe("prices match what GotPrint charges", () => {
  it("quotes the verified figures from the spreadsheet", () => {
    expect(calculatePostcardPrice({ size: STD, paper: GLOSS, color: FRONT, quantity: 50 }).total).toBe(19.44);
    expect(calculatePostcardPrice({ size: STD, paper: "14 pt. Uncoated", color: FRONT, quantity: 50 }).total).toBe(19.44);
    expect(calculatePostcardPrice({ size: STD, paper: "16 pt. Premium Matte", color: FRONT, quantity: 50 }).total).toBe(22.8);
    expect(calculatePostcardPrice({ size: STD, paper: "18 pt. Ultra Premium Smooth White", color: FRONT, quantity: 50 }).total).toBe(45.6);
  });

  it("gets cheaper per card as the run grows", () => {
    const small = calculatePostcardPrice({ size: STD, paper: GLOSS, color: FRONT, quantity: 100 }).total / 100;
    const large = calculatePostcardPrice({ size: STD, paper: GLOSS, color: FRONT, quantity: 5000 }).total / 5000;
    expect(large).toBeLessThan(small);
  });

  it("charges more for printing both sides", () => {
    const front = calculatePostcardPrice({ size: STD, paper: GLOSS, color: FRONT, quantity: 500 }).total;
    const both = calculatePostcardPrice({ size: STD, paper: GLOSS, color: "Full Color Both Sides", quantity: 500 }).total;
    expect(both).toBeGreaterThan(front);
  });
});

/**
 * The supplier's catalogue is ragged, and the site has to reflect that rather than paper over it.
 * Offering a combination GotPrint will not print turns into a failure after payment instead of a
 * disabled option before it.
 */
describe("availability follows the supplier, not a tidy grid", () => {
  it("offers a grayscale back only on the stocks that support it", () => {
    expect(availableColors(STD, GLOSS)).toContain(GRAYSCALE);
    expect(availableColors(STD, TRIFECTA)).not.toContain(GRAYSCALE);
  });

  it("starts heavier stocks at higher quantities", () => {
    const gloss = availableQuantities(STD, GLOSS, FRONT);
    const trifecta = availableQuantities(STD, TRIFECTA, FRONT);
    expect(trifecta.length).toBeLessThan(gloss.length);
    expect(Math.min(...trifecta)).toBeGreaterThan(Math.min(...gloss));
  });

  it("refuses a combination the supplier does not print", () => {
    const r = calculatePostcardPrice({ size: STD, paper: TRIFECTA, color: GRAYSCALE, quantity: 500 });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/isn't available/i);
  });

  it("refuses a quantity below a stock's minimum, and says which problem it is", () => {
    const r = calculatePostcardPrice({ size: STD, paper: TRIFECTA, color: FRONT, quantity: 25 });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/quantity/i);
  });

  it("never quotes anything it was not given an exact price for", () => {
    // 300 sits between the 250 and 500 breaks. Banners showed interpolation underpricing real
    // orders by up to 12%, so an in-between quantity is refused rather than estimated.
    expect(calculatePostcardPrice({ size: STD, paper: GLOSS, color: FRONT, quantity: 300 }).valid).toBe(false);
  });

  it("prices every combination it claims to offer", () => {
    for (const size of POSTCARD_SIZES) {
      for (const paper of POSTCARD_PAPERS) {
        for (const color of availableColors(size.label, paper.label)) {
          expect(isComboAvailable(size.label, paper.label, color)).toBe(true);
          for (const quantity of availableQuantities(size.label, paper.label, color)) {
            const r = calculatePostcardPrice({ size: size.label, paper: paper.label, color, quantity });
            expect(r.valid, `${size.label} / ${paper.label} / ${color} / ${quantity}`).toBe(true);
            expect(r.total).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});
