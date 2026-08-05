import { describe, it, expect } from "vitest";
import {
  BANNER_MATERIALS, BANNER_POINTS, BANNER_QUANTITIES, BANNER_SIZES,
  areaSqFt, calculateBannerPrice,
} from "@/lib/pricing/banners";

const SIZE = "2 ft x 4 ft";
const GLOSSY = "13 oz. Premium Scrim Glossy Vinyl";

describe("catalogue", () => {
  it("offers the sizes and materials that were actually priced", () => {
    expect(BANNER_SIZES.length).toBe(12);
    expect(BANNER_MATERIALS.map((m) => m.label)).toContain(GLOSSY);
  });

  it("orders sizes by area, so the list reads small to large", () => {
    const areas = BANNER_SIZES.map((s) => areaSqFt(s.label));
    expect([...areas].sort((a, b) => a - b)).toEqual(areas);
  });

  it("has an exact scraped price for every offered quantity, on every size and material", () => {
    // This is what lets the builder quote without interpolating. If a future re-scrape drops a
    // break, this fails rather than the site quietly guessing a price.
    for (const size of BANNER_SIZES) {
      for (const material of BANNER_MATERIALS) {
        for (const quantity of BANNER_QUANTITIES) {
          const r = calculateBannerPrice({ size: size.label, material: material.label, quantity });
          expect(r.valid, `${size.label} / ${material.label} / ${quantity}`).toBe(true);
          expect(r.exact, `${size.label} / ${material.label} / ${quantity} was interpolated`).toBe(true);
        }
      }
    }
  });
});

describe("prices match what GotPrint charges", () => {
  it("quotes the verified figures", () => {
    // Cross-checked against the supplied spreadsheet as well as the live configurator.
    expect(calculateBannerPrice({ size: SIZE, material: GLOSSY, quantity: 1 }).total).toBe(14.17);
    expect(calculateBannerPrice({ size: "3 ft x 6 ft", material: GLOSSY, quantity: 1 }).total).toBe(24.46);
    expect(calculateBannerPrice({ size: "4 ft x 8 ft", material: GLOSSY, quantity: 1 }).total).toBe(38.58);
  });

  it("gets cheaper per unit as the run grows", () => {
    const one = calculateBannerPrice({ size: SIZE, material: GLOSSY, quantity: 1 }).total;
    const hundred = calculateBannerPrice({ size: SIZE, material: GLOSSY, quantity: 100 }).total;
    expect(hundred / 100).toBeLessThan(one);
  });
});

/**
 * Interpolation is measured, not assumed.
 *
 * 2 ft x 4 ft was captured with all 41 quantities before the run was scoped to 8 breaks, so it can
 * act as a control: withhold the 33 quantities that are not breaks, predict them from the breaks
 * alone, and compare against what the supplier actually charges.
 *
 * The answer is that interpolation is not good enough to quote from. Mean absolute error is about
 * 3%, but the worst case is 18.7% and eight of the 33 come out UNDER the real cost - at quantity 6
 * it predicts $82.36 against an actual $94.00. With print sold at cost, a 12% shortfall is a
 * straight loss on the order. Hence the test above: the builder only ever offers quantities that
 * have an exact price.
 */
describe("why the builder does not interpolate", () => {
  const breaks = new Set(BANNER_QUANTITIES);
  const withheld = BANNER_POINTS.filter((p) => p.size === SIZE && p.material === GLOSSY && !breaks.has(p.quantity));
  const training = BANNER_POINTS.filter((p) => !(p.size === SIZE && p.material === GLOSSY) || breaks.has(p.quantity));

  it("has a control set to measure against", () => {
    expect(withheld.length).toBeGreaterThan(30);
  });

  it("would underprice real orders if it were used", () => {
    const errors = withheld.map((p) => {
      const predicted = calculateBannerPrice({ size: SIZE, material: GLOSSY, quantity: p.quantity }, training).total;
      return ((predicted - p.price) / p.price) * 100;
    });
    // Documents the measured risk. If a future change makes interpolation safe, this fails and the
    // decision above can be revisited on evidence rather than on feel.
    expect(Math.min(...errors)).toBeLessThan(-5);
    expect(Math.max(...errors.map(Math.abs))).toBeGreaterThan(10);
  });

  it("marks an interpolated figure as inexact so it can never pass for a quote", () => {
    const r = calculateBannerPrice({ size: SIZE, material: GLOSSY, quantity: 6 }, training);
    expect(r.exact).toBe(false);
  });
});
