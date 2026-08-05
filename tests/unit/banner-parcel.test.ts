import { describe, it, expect } from "vitest";
import { bannerParcel, materialOzPerSqFt } from "@/lib/shipping/banner-parcel";

const SCRIM = "13 oz. Premium Scrim Glossy Vinyl";
const MESH = "8 oz. Premium Mesh Vinyl";

describe("material weight", () => {
  it("reads oz per square yard from the name and converts to square feet", () => {
    // "13 oz." vinyl means 13 oz per square yard, and a square yard is nine square feet.
    expect(materialOzPerSqFt(SCRIM)).toBeCloseTo(13 / 9, 3);
    expect(materialOzPerSqFt(MESH)).toBeCloseTo(8 / 9, 3);
  });

  it("makes mesh lighter than scrim at the same size", () => {
    expect(bannerParcel("4 ft x 8 ft", MESH, 1).weightOz)
      .toBeLessThan(bannerParcel("4 ft x 8 ft", SCRIM, 1).weightOz);
  });

  it("defaults to 13 oz for an unrecognised material rather than weightless", () => {
    expect(materialOzPerSqFt("Some New Vinyl")).toBeCloseTo(13 / 9, 3);
  });
});

describe("parcel weight lands where a real banner does", () => {
  it("puts a 4x8ft scrim banner near three pounds of vinyl plus packaging", () => {
    // 32 sq ft at 1.444 oz/sq ft is 46 oz of vinyl - just under 3 lb - and the tube, hems and
    // grommets take the shipped parcel to somewhere between 5 and 6.5 lb.
    const oz = bannerParcel("4 ft x 8 ft", SCRIM, 1).weightOz;
    expect(oz).toBeGreaterThan(16 * 5);
    expect(oz).toBeLessThan(16 * 6.5);
  });

  it("scales with area", () => {
    const small = bannerParcel("2 ft x 3 ft", SCRIM, 1).weightOz;
    const large = bannerParcel("4 ft x 12 ft", SCRIM, 1).weightOz;
    expect(large).toBeGreaterThan(small * 2);
  });

  it("never returns a weightless or zero-sized parcel", () => {
    for (const size of ["1 ft x 2 ft", "4 ft x 12 ft"]) {
      for (const q of [1, 10, 100]) {
        const p = bannerParcel(size, SCRIM, q);
        expect(p.weightOz).toBeGreaterThan(0);
        expect(Math.min(p.lengthIn, p.widthIn, p.heightIn)).toBeGreaterThan(0);
      }
    }
  });
});

describe("tube geometry", () => {
  it("sets tube length from the short edge, since that is the roll axis", () => {
    // A 4x8ft banner rolls along its 4ft edge, giving a tube a little over 48in long.
    const p = bannerParcel("4 ft x 8 ft", SCRIM, 1);
    expect(p.lengthIn).toBe(50);
    // Same short edge, longer banner: same tube length, fatter roll.
    expect(bannerParcel("4 ft x 12 ft", SCRIM, 1).lengthIn).toBe(50);
  });

  it("grows the diameter with quantity, not the length", () => {
    const one = bannerParcel("4 ft x 8 ft", SCRIM, 1);
    const ten = bannerParcel("4 ft x 8 ft", SCRIM, 10);
    expect(ten.lengthIn).toBe(one.lengthIn);
    expect(ten.widthIn).toBeGreaterThan(one.widthIn);
  });

  it("stays inside the carriers' length-plus-girth limit", () => {
    for (const size of ["4 ft x 8 ft", "4 ft x 12 ft"]) {
      const p = bannerParcel(size, SCRIM, 25);
      expect(2 * (p.widthIn + p.heightIn) + p.lengthIn).toBeLessThan(108);
    }
  });
});

/**
 * A large banner run genuinely exceeds what a parcel carrier will take.
 *
 * Twenty-five 4x8ft banners is about 90 lb in one tube, and the major carriers cap ground parcels
 * at 70 lb. The rate call would either fail or come back with an overweight surcharge that the
 * customer was never quoted. This is documented rather than silently ignored, so the split into
 * multiple tubes is a known piece of work and not a surprise in production.
 */
describe("known limit: heavy runs need splitting", () => {
  const CARRIER_MAX_OZ = 70 * 16;

  it("stays shippable in one tube for the quantities most orders use", () => {
    for (const q of [1, 2, 5, 10]) {
      expect(bannerParcel("4 ft x 8 ft", SCRIM, q).weightOz).toBeLessThan(CARRIER_MAX_OZ);
    }
  });

  it("exceeds a single parcel's limit on the largest runs", () => {
    expect(bannerParcel("4 ft x 8 ft", SCRIM, 25).weightOz).toBeGreaterThan(CARRIER_MAX_OZ);
  });
});
