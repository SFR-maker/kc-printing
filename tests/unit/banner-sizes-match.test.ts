import { describe, it, expect } from "vitest";
import { BANNER_SIZES as DESIGN_PRESETS } from "@/lib/business-card/print-spec";
import { BANNER_SIZES as SELLABLE } from "@/lib/pricing/banners";

/**
 * You must be able to buy what you just designed.
 *
 * The design tool offered four roll-up and table-top stands with no price behind them, so a customer
 * could design a "Roll-Up Stand 24 x 81 in", reach the order page and find no way to order it. Eight
 * of the twelve sizes that are priced had no preset at all. These are two separate lists in two
 * separate files, so nothing but a test keeps them together.
 */

/** "Vinyl Banner 3 ft x 6 ft" -> "3 ft x 6 ft", the label the price table is keyed by. */
function toSellableLabel(presetLabel: string): string {
  return presetLabel.replace(/^Vinyl Banner\s+/i, "").trim();
}

describe("banner design presets and the price list agree", () => {
  const sellable = new Set(SELLABLE.map((s) => s.label));

  it("offers a preset for every size that can be bought", () => {
    const presets = new Set(DESIGN_PRESETS.map((p) => toSellableLabel(p.label)));
    const missing = [...sellable].filter((s) => !presets.has(s));
    expect(missing).toEqual([]);
  });

  it("offers no preset that cannot be bought", () => {
    const unsellable = DESIGN_PRESETS.map((p) => toSellableLabel(p.label)).filter((l) => !sellable.has(l));
    expect(unsellable).toEqual([]);
  });

  it("has no roll-up or stand presets while those are not sold", () => {
    for (const p of DESIGN_PRESETS) {
      expect(p.key, p.label).not.toMatch(/rollup|tabletop/i);
      expect(p.label).not.toMatch(/stand/i);
    }
  });

  it("states each preset's dimensions in inches consistently with its label", () => {
    for (const p of DESIGN_PRESETS) {
      const m = toSellableLabel(p.label).match(/([\d.]+)\s*ft\s*x\s*([\d.]+)\s*ft/i);
      expect(m, p.label).not.toBeNull();
      const [a, b] = [Number(m![1]) * 12, Number(m![2]) * 12];
      // Whichever way round the label reads, the preset covers the same two edges.
      expect([p.trimWidthIn, p.trimHeightIn].sort((x, y) => x - y)).toEqual([a, b].sort((x, y) => x - y));
    }
  });
});
