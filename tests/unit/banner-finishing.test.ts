import { describe, it, expect } from "vitest";
import {
  GROMMET_OPTIONS, DEFAULT_GROMMETS, HEMMING_INCLUDED,
  grommetPrice, isGrommetPriced,
} from "@/lib/pricing/banner-finishing";
import { BANNER_SIZES, BANNER_QUANTITIES } from "@/lib/pricing/banners";

/**
 * Grommets are quoted by the supplier as an extra on top of the size/material/quantity curve, and
 * the original scrape never captured them. The builder told the customer the banner came "hemmed
 * with grommets" and charged for neither, so every banner sold with grommets lost the grommet cost -
 * print sells at cost, so it came straight off the job.
 */

describe("what the supplier actually offers", () => {
  it("offers the three grommet choices", () => {
    expect(GROMMET_OPTIONS).toEqual(["No Grommets", "Grommets - Every 2ft", "Grommets - 4 Corners"]);
  });

  it("defaults to the option an outdoor banner usually needs", () => {
    expect(GROMMET_OPTIONS).toContain(DEFAULT_GROMMETS);
    expect(DEFAULT_GROMMETS).toBe("Grommets - Every 2ft");
  });

  it("treats hemming as included rather than as a choice", () => {
    expect(HEMMING_INCLUDED).toBe("Hemming - 4 Sides");
  });
});

describe("prices match the quotes", () => {
  it("charges nothing for no grommets", () => {
    expect(grommetPrice("3 ft x 6 ft", "No Grommets", 1)).toBe(0);
  });

  it("charges a flat 30c for four corners, whatever the size", () => {
    // Four holes is four holes: the quote does not move with the banner.
    for (const size of BANNER_SIZES) {
      expect(grommetPrice(size.label, "Grommets - 4 Corners", 1), size.label).toBe(0.3);
    }
  });

  it("scales every-2ft grommets with the size of the banner", () => {
    const small = grommetPrice("1 ft x 2 ft", "Grommets - Every 2ft", 1);
    const large = grommetPrice("4 ft x 12 ft", "Grommets - Every 2ft", 1);
    expect(small).toBe(0.9);
    expect(large).toBeGreaterThan(small);
  });

  it("scales with quantity, since each banner is finished", () => {
    const one = grommetPrice("3 ft x 6 ft", "Grommets - Every 2ft", 1);
    const five = grommetPrice("3 ft x 6 ft", "Grommets - Every 2ft", 5);
    expect(five).toBeCloseTo(one * 5, 2);
  });
});

describe("every combination the builder can produce is quoted", () => {
  it("prices all sizes, grommet options and quantities on offer", () => {
    const missing: string[] = [];
    for (const size of BANNER_SIZES) {
      for (const g of GROMMET_OPTIONS) {
        for (const q of BANNER_QUANTITIES) {
          if (!isGrommetPriced(size.label, g, q)) missing.push(`${size.label} / ${g} / ${q}`);
        }
      }
    }
    expect(missing.slice(0, 5)).toEqual([]);
  });

  it("reports an unquoted combination rather than treating it as free", () => {
    // A silent 0 here is a loss on the job, so absence has to be distinguishable from no charge.
    expect(isGrommetPriced("3 ft x 6 ft", "Grommets - Every 2ft", 999_999)).toBe(false);
    expect(grommetPrice("3 ft x 6 ft", "Grommets - Every 2ft", 999_999)).toBe(0);
  });
});
