import { describe, it, expect } from "vitest";
import { bcTrimInches, BC_SIZES } from "@/lib/pricing/business-cards";

/**
 * The artwork step used one hardcoded pair of constants for every card, so choosing a vertical card
 * still asked for a 3.5 x 2 landscape upload and proofed against it. These lock the mapping.
 */
describe("bcTrimInches", () => {
  it("gives every catalogue size a real trim", () => {
    for (const s of BC_SIZES) {
      const t = bcTrimInches(s.id);
      expect(t, `no trim for ${s.label}`).not.toBeNull();
      expect(t!.widthIn).toBeGreaterThan(0);
      expect(t!.heightIn).toBeGreaterThan(0);
    }
  });

  it("puts the long edge across on horizontal and up on vertical", () => {
    for (const s of BC_SIZES) {
      const t = bcTrimInches(s.id)!;
      if (s.orientation === 2) expect(t.heightIn, s.label).toBeGreaterThan(t.widthIn);
      else expect(t.widthIn, s.label).toBeGreaterThanOrEqual(t.heightIn);
    }
  });

  it("reads US standard as 3.5 x 2", () => {
    const std = BC_SIZES.find((s) => /3\.5/.test(s.label) && /2/.test(s.label) && s.orientation === 1)!;
    expect(bcTrimInches(std.id)).toEqual({ widthIn: 3.5, heightIn: 2 });
  });

  it("returns null for an unknown size rather than guessing", () => {
    expect(bcTrimInches(-1)).toBeNull();
  });
});
