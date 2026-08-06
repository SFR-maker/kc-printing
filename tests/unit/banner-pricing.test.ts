import { describe, it, expect } from "vitest";
import {
  BANNER_SIZES, BANNER_MATERIALS, BANNER_QUANTITIES, BANNER_COLOR,
  areaSqFt, bannerQuantitiesFor, isBannerComboAvailable,
} from "@/lib/pricing/banners";
import raw from "@/lib/pricing/banners-scraped.json";

/**
 * Banners are quoted from the supplier's whole catalogue - 110 sizes, 41 quantity breaks - and
 * nothing is interpolated any more. The previous table held twelve hand-picked sizes with eight
 * breaks each and filled the gaps by interpolating, which was measured underpricing real orders by
 * up to 12%.
 *
 * The price table is imported directly here rather than through lib/pricing/banners-server, which is
 * marked server-only and cannot load in a test process.
 */

const prices = (raw as unknown as { prices: Record<string, number> }).prices;
const priceFor = (size: string, material: string, qty: number) =>
  prices[`${size}|${material}|${BANNER_COLOR}|${qty}`];

describe("catalogue", () => {
  it("offers the supplier's whole size range", () => {
    expect(BANNER_SIZES.length).toBe(110);
  });

  it("offers all three materials", () => {
    expect(BANNER_MATERIALS.map((m) => m.label)).toEqual([
      "13 oz. Premium Scrim Glossy Vinyl",
      "13 oz. Premium Scrim Matte Vinyl",
      "8 oz. Premium Mesh Vinyl",
    ]);
  });

  it("offers every quantity break the supplier quotes, not a hand-picked few", () => {
    // This was [1, 2, 3, 5, 10, 25, 50, 100] while the supplier quotes 41 breaks, so most of the
    // curve was unreachable - nobody could order 60 banners.
    expect(BANNER_QUANTITIES.length).toBe(41);
    expect(BANNER_QUANTITIES[0]).toBe(1);
    expect(BANNER_QUANTITIES.at(-1)).toBe(150);
  });

  it("orders sizes smallest to largest", () => {
    const areas = BANNER_SIZES.map((s) => areaSqFt(s.label));
    expect([...areas].sort((a, b) => a - b)).toEqual(areas);
  });

  it("gives every size a real area", () => {
    for (const s of BANNER_SIZES) expect(areaSqFt(s.label), s.label).toBeGreaterThan(0);
  });
});

describe("every combination the picker offers is quoted", () => {
  it("prices all sizes, materials and quantities on offer", () => {
    const missing: string[] = [];
    let checked = 0;
    for (const size of BANNER_SIZES) {
      for (const material of BANNER_MATERIALS) {
        if (!isBannerComboAvailable(size.label, material.label)) continue;
        for (const q of bannerQuantitiesFor(size.label, material.label)) {
          checked++;
          if (priceFor(size.label, material.label, q) === undefined) {
            missing.push(`${size.label} / ${material.label} / ${q}`);
          }
        }
      }
    }
    expect(missing.slice(0, 5)).toEqual([]);
    expect(checked).toBeGreaterThan(13000);
  });

  it("has no zero or negative prices", () => {
    expect(Object.values(prices).every((v) => v > 0)).toBe(true);
  });
});

describe("prices behave the way a print quote should", () => {
  const size = "3 ft x 6 ft";
  const material = "13 oz. Premium Scrim Glossy Vinyl";

  it("does not assume the per-unit rate falls with volume", () => {
    /*
     * It does not, and that is the supplier's pricing rather than bad data. A 3 x 6ft glossy runs
     * $24.46 at one, $26.28 each at five, $21.03 each at twenty and $25.24 each at fifty. Verified
     * against the live quotes - q1 $24.46, q5 $131.38, q20 $420.64, q50 $1,262.12, q150 $3,628.81 -
     * all matching exactly. So the useful assertion is that a bigger run costs more in total, not
     * less per unit.
     */
    // Nor is the total monotonic. Verified live: q14 $348.30, q15 $336.45, q16 $363.00 - fifteen
    // banners cost $11.85 less than fourteen. So the only safe assertions are that every break is
    // quoted, positive, and that a large run costs more than a small one.
    for (const q of BANNER_QUANTITIES) {
      expect(priceFor(size, material, q), `quantity ${q}`).toBeGreaterThan(0);
    }
    expect(priceFor(size, material, 150)).toBeGreaterThan(priceFor(size, material, 1));
  });

  it("costs more for a bigger banner at the same quantity", () => {
    expect(priceFor("4 ft x 12 ft", material, 1)).toBeGreaterThan(priceFor("1 ft x 2 ft", material, 1));
  });

  it("keeps prices above a thousand dollars", () => {
    // markupPrice arrives comma-formatted above $999.99, so Number("1,035.24") was NaN and every
    // such price was silently dropped - the table used to top out at exactly $999.25, truncating
    // the higher quantities out of the catalogue.
    const values = Object.values(prices);
    expect(values.filter((v) => v > 1000).length).toBeGreaterThan(1000);
    expect(Math.max(...values)).toBeGreaterThan(10000);
  });
});
