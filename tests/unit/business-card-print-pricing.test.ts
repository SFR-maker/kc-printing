import { describe, it, expect } from "vitest";
import { DEFAULT_PRICING } from "@/lib/pricing/settings";
import { backArtworkLabel, needsBackArtwork } from "@/lib/business-card/print-spec";
import { calculateBusinessCardPrice, availableQuantities, isComboAvailable, BC_SIZES, BC_PAPERS, BC_COLORS, BC_ALL_QUANTITIES } from "@/lib/pricing/business-cards";

// Reference numbers below are gotprint.com's own scraped prices (before 611 Printing's 1.25x markup),
// captured 2026-07-25 from their pricing REST API for the standard 2x3.5 card (size=101), 14pt Gloss
// (paper=1), full color front only (color=1), regular turnaround.
describe("calculateBusinessCardPrice", () => {
  it("applies whatever markup is configured, rather than a hardcoded one", () => {
    // Asserted against the configured multiplier, not a literal. Print now sells at cost, and the
    // owner can change that from /admin/pricing at any time - a test pinned to 1.25 broke the
    // moment they did, while testing nothing about the calculation itself.
    const result = calculateBusinessCardPrice({ sizeId: 101, paperId: 1, colorId: 1, quantity: 100 });
    expect(result.valid).toBe(true);
    expect(result.basePrice).toBeCloseTo(11.55 * DEFAULT_PRICING.markupMultiplier, 2);
    expect(result.total).toBeCloseTo(result.basePrice, 2);
  });

  it("scales correctly across quantity tiers", () => {
    const m = DEFAULT_PRICING.markupMultiplier;
    const qty50 = calculateBusinessCardPrice({ sizeId: 101, paperId: 1, colorId: 1, quantity: 50 });
    const qty1000 = calculateBusinessCardPrice({ sizeId: 101, paperId: 1, colorId: 1, quantity: 1000 });
    expect(qty50.basePrice).toBeCloseTo(9.59 * m, 2);
    expect(qty1000.basePrice).toBeCloseTo(32.76 * m, 2);
    expect(qty1000.basePrice).toBeGreaterThan(qty50.basePrice);
  });

  it("sells print at cost by default", () => {
    // The shop's decision: margin comes from design services and shipping handling, not print.
    expect(DEFAULT_PRICING.markupMultiplier).toBe(1);
  });

  it("premium paper costs more than standard gloss at the same size/quantity", () => {
    const gloss = calculateBusinessCardPrice({ sizeId: 101, paperId: 1, colorId: 1, quantity: 100 });
    const linen = calculateBusinessCardPrice({ sizeId: 101, paperId: 74, colorId: 1, quantity: 100 });
    expect(linen.basePrice).toBeGreaterThan(gloss.basePrice);
  });

  it("both-sides color costs more than front-only at the same size/paper/quantity", () => {
    const frontOnly = calculateBusinessCardPrice({ sizeId: 101, paperId: 1, colorId: 1, quantity: 100 });
    const bothSides = calculateBusinessCardPrice({ sizeId: 101, paperId: 1, colorId: 3, quantity: 100 });
    expect(bothSides.basePrice).toBeGreaterThan(frontOnly.basePrice);
  });

  it("adds a rush surcharge on top of the base price when rush is requested", () => {
    const regular = calculateBusinessCardPrice({ sizeId: 101, paperId: 1, colorId: 1, quantity: 100 });
    const rushed = calculateBusinessCardPrice({ sizeId: 101, paperId: 1, colorId: 1, quantity: 100, rush: true });
    expect(rushed.valid).toBe(true);
    expect(rushed.rushSurcharge).toBeGreaterThan(0);
    expect(rushed.total).toBeCloseTo(regular.basePrice + rushed.rushSurcharge, 2);
  });

  it("rejects rush turnaround above gotprint's real 2,500-unit cutoff", () => {
    const result = calculateBusinessCardPrice({ sizeId: 101, paperId: 1, colorId: 1, quantity: 5000, rush: true });
    expect(result.valid).toBe(false);
  });

  it("adds round-corners pricing that scales with quantity", () => {
    const small = calculateBusinessCardPrice({ sizeId: 101, paperId: 1, colorId: 1, quantity: 100, roundCorners: true });
    const large = calculateBusinessCardPrice({ sizeId: 101, paperId: 1, colorId: 1, quantity: 10000, roundCorners: true });
    expect(small.roundCornersPrice).toBeGreaterThan(0);
    expect(large.roundCornersPrice).toBeGreaterThan(small.roundCornersPrice);
  });

  it("adds a flat $3 for a manually processed proof", () => {
    const result = calculateBusinessCardPrice({ sizeId: 101, paperId: 1, colorId: 1, quantity: 100, manualProof: true });
    expect(result.proofPrice).toBe(3);
  });

  it("marks grayscale-back paired with a premium paper as unavailable, matching gotprint", () => {
    // paper 74 (13pt Premium Linen) doesn't offer color 2 (grayscale back) on the real site.
    expect(isComboAvailable(101, 74, 2)).toBe(false);
    const result = calculateBusinessCardPrice({ sizeId: 101, paperId: 74, colorId: 2, quantity: 100 });
    expect(result.valid).toBe(false);
  });

  it("rejects a quantity that isn't a real gotprint break point", () => {
    const result = calculateBusinessCardPrice({ sizeId: 101, paperId: 1, colorId: 1, quantity: 77 });
    expect(result.valid).toBe(false);
  });

  it("exposes the full reference catalog", () => {
    expect(BC_SIZES.length).toBe(10);
    expect(BC_PAPERS.length).toBe(12);
    expect(BC_COLORS.length).toBe(3);
    expect(BC_ALL_QUANTITIES).toContain(100);
    expect(BC_ALL_QUANTITIES).toContain(100000);
  });

  it("lists only the quantities actually available for a given combo", () => {
    const qtys = availableQuantities(101, 1, 1);
    expect(qtys.length).toBeGreaterThan(20);
    expect(qtys).toEqual([...qtys].sort((a, b) => a - b));
  });
});

/**
 * Guards the prices against GotPrint's published figures.
 *
 * The 14 pt. Uncoated column was scraped as gloss and sat below cost for months - $16.45 quoted for
 * 250 cards that cost $27.30 to buy. These pin the two stocks the spreadsheet verifies in full, so
 * a future re-scrape cannot quietly reintroduce the same class of error.
 */
describe("published GotPrint pricing", () => {
  const GLOSS = 1;
  const UNCOATED = 2;
  const STANDARD = 101;
  const FRONT_ONLY = 1;

  const VERIFIED: Record<number, { gloss: number; uncoated: number }> = {
    50: { gloss: 9.59, uncoated: 14.7 },
    100: { gloss: 11.55, uncoated: 16.8 },
    250: { gloss: 16.8, uncoated: 27.3 },
    500: { gloss: 24.85, uncoated: 31.5 },
    1000: { gloss: 32.76, uncoated: 42.7 },
    2500: { gloss: 59.5, uncoated: 67.2 },
    5000: { gloss: 108.5, uncoated: 126 },
    10000: { gloss: 206.5, uncoated: 241.5 },
  };

  /** Base price before markup — what the stock costs us. */
  const cost = (paperId: number, quantity: number) =>
    calculateBusinessCardPrice(
      { sizeId: STANDARD, paperId, colorId: FRONT_ONLY, quantity },
      { ...DEFAULT_PRICING, markupMultiplier: 1 }
    ).basePrice;

  for (const [qty, want] of Object.entries(VERIFIED)) {
    it(`matches GotPrint at ${qty} cards`, () => {
      expect(cost(GLOSS, Number(qty))).toBeCloseTo(want.gloss, 2);
      expect(cost(UNCOATED, Number(qty))).toBeCloseTo(want.uncoated, 2);
    });
  }

  it("never sells uncoated below gloss, which is what the bad scrape did", () => {
    for (const qty of Object.keys(VERIFIED).map(Number)) {
      expect(cost(UNCOATED, qty)).toBeGreaterThan(cost(GLOSS, qty));
    }
  });
});

describe("which print options need a back file", () => {
  it("front-only needs no back", () => {
    expect(needsBackArtwork(1)).toBe(false);
  });

  it("a grayscale back is still a back", () => {
    // The commonest miss: "grayscale back" reads like an option rather than a second face, but it
    // prints on the reverse and needs its own file and its own approval.
    expect(needsBackArtwork(2)).toBe(true);
    expect(backArtworkLabel(2)).toBe("Back (grayscale)");
  });

  it("full colour both sides needs a back", () => {
    expect(needsBackArtwork(3)).toBe(true);
    expect(backArtworkLabel(3)).toBe("Back (full colour)");
  });
});
