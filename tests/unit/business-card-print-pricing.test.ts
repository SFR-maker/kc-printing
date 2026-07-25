import { describe, it, expect } from "vitest";
import { calculateBusinessCardPrice, availableQuantities, isComboAvailable, BC_SIZES, BC_PAPERS, BC_COLORS, BC_ALL_QUANTITIES } from "@/lib/pricing/business-cards";

// Reference numbers below are gotprint.com's own scraped prices (before KC Printing's 1.25x markup),
// captured 2026-07-25 from their pricing REST API for the standard 2x3.5 card (size=101), 14pt Gloss
// (paper=1), full color front only (color=1), regular turnaround.
describe("calculateBusinessCardPrice", () => {
  it("applies the markup to the base gotprint price for the standard config", () => {
    const result = calculateBusinessCardPrice({ sizeId: 101, paperId: 1, colorId: 1, quantity: 100 });
    expect(result.valid).toBe(true);
    expect(result.basePrice).toBeCloseTo(11.55 * 1.25, 2);
    expect(result.total).toBeCloseTo(result.basePrice, 2);
  });

  it("scales correctly across quantity tiers", () => {
    const qty50 = calculateBusinessCardPrice({ sizeId: 101, paperId: 1, colorId: 1, quantity: 50 });
    const qty1000 = calculateBusinessCardPrice({ sizeId: 101, paperId: 1, colorId: 1, quantity: 1000 });
    expect(qty50.basePrice).toBeCloseTo(9.59 * 1.25, 2);
    expect(qty1000.basePrice).toBeCloseTo(32.76 * 1.25, 2);
    expect(qty1000.basePrice).toBeGreaterThan(qty50.basePrice);
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
