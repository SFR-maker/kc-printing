import { describe, it, expect } from "vitest";
import { DEFAULT_PRICING, PRICING_KEYS, parsePricingSettings, parseShippingTiers } from "@/lib/pricing/settings";
import { calculateBusinessCardPrice } from "@/lib/pricing/business-cards";

const SPEC = { sizeId: 101, paperId: 7, colorId: 1, quantity: 250, rush: false, roundCorners: false, manualProof: false };

describe("parsePricingSettings", () => {
  it("falls back to the compiled defaults when nothing is stored", () => {
    expect(parsePricingSettings([])).toEqual(DEFAULT_PRICING);
  });

  it("reads a stored markup", () => {
    const s = parsePricingSettings([{ key: PRICING_KEYS.markupMultiplier, value: "1.6" }]);
    expect(s.markupMultiplier).toBe(1.6);
  });

  it("ignores a markup below 1, which would sell every order at a loss", () => {
    const s = parsePricingSettings([{ key: PRICING_KEYS.markupMultiplier, value: "0.5" }]);
    expect(s.markupMultiplier).toBe(DEFAULT_PRICING.markupMultiplier);
  });

  it("ignores a markup typo that would quote five-figure business cards", () => {
    // 125 instead of 1.25 is a far likelier keystroke than a legitimate 125x margin.
    const s = parsePricingSettings([{ key: PRICING_KEYS.markupMultiplier, value: "125" }]);
    expect(s.markupMultiplier).toBe(DEFAULT_PRICING.markupMultiplier);
  });

  it("ignores values that are not numbers at all", () => {
    const s = parsePricingSettings([{ key: PRICING_KEYS.manualProofPrice, value: "free" }]);
    expect(s.manualProofPrice).toBe(DEFAULT_PRICING.manualProofPrice);
  });

  it("allows a zero manual-proof fee, which is a real choice", () => {
    const s = parsePricingSettings([{ key: PRICING_KEYS.manualProofPrice, value: "0" }]);
    expect(s.manualProofPrice).toBe(0);
  });
});

describe("parseShippingTiers", () => {
  const good = JSON.stringify([
    { id: "flat", label: "Flat", price: 8, minBusinessDays: 3, maxBusinessDays: 6, recommended: true },
  ]);

  it("reads a valid list", () => {
    expect(parseShippingTiers(good)).toHaveLength(1);
    expect(parseShippingTiers(good)[0].price).toBe(8);
  });

  it("falls back rather than leaving checkout with no shipping options", () => {
    for (const bad of ["", "not json", "{}", "[]", JSON.stringify([{ id: "x" }])]) {
      expect(parseShippingTiers(bad)).toEqual(DEFAULT_PRICING.shippingTiers);
    }
  });

  it("rejects a list where the minimum transit exceeds the maximum", () => {
    const bad = JSON.stringify([{ id: "x", label: "X", price: 5, minBusinessDays: 9, maxBusinessDays: 2 }]);
    expect(parseShippingTiers(bad)).toEqual(DEFAULT_PRICING.shippingTiers);
  });

  it("rejects duplicate ids, which would collide as Stripe shipping rates", () => {
    const bad = JSON.stringify([
      { id: "same", label: "A", price: 5, minBusinessDays: 1, maxBusinessDays: 2 },
      { id: "same", label: "B", price: 9, minBusinessDays: 1, maxBusinessDays: 2 },
    ]);
    expect(parseShippingTiers(bad)).toEqual(DEFAULT_PRICING.shippingTiers);
  });

  it("rejects more than one recommended tier, since only one can be preselected", () => {
    const bad = JSON.stringify([
      { id: "a", label: "A", price: 5, minBusinessDays: 1, maxBusinessDays: 2, recommended: true },
      { id: "b", label: "B", price: 9, minBusinessDays: 1, maxBusinessDays: 2, recommended: true },
    ]);
    expect(parseShippingTiers(bad)).toEqual(DEFAULT_PRICING.shippingTiers);
  });
});

describe("settings actually move the price", () => {
  it("charges more at a higher markup", () => {
    const base = calculateBusinessCardPrice(SPEC, { ...DEFAULT_PRICING, markupMultiplier: 1.25 });
    const dearer = calculateBusinessCardPrice(SPEC, { ...DEFAULT_PRICING, markupMultiplier: 1.5 });
    expect(dearer.total).toBeGreaterThan(base.total);
    expect(dearer.basePrice / base.basePrice).toBeCloseTo(1.5 / 1.25, 2);
  });

  it("uses the stored manual-proof fee", () => {
    const priced = calculateBusinessCardPrice(
      { ...SPEC, manualProof: true },
      { ...DEFAULT_PRICING, manualProofPrice: 12 }
    );
    expect(priced.proofPrice).toBe(12);
  });

  it("uses the stored rounded-corner markup", () => {
    const cheap = calculateBusinessCardPrice({ ...SPEC, roundCorners: true }, { ...DEFAULT_PRICING, roundCornersMarkup: 1 });
    const dear = calculateBusinessCardPrice({ ...SPEC, roundCorners: true }, { ...DEFAULT_PRICING, roundCornersMarkup: 2 });
    expect(dear.roundCornersPrice).toBeCloseTo(cheap.roundCornersPrice * 2, 2);
  });

  it("defaults to the compiled settings when none are passed", () => {
    expect(calculateBusinessCardPrice(SPEC).total).toBe(calculateBusinessCardPrice(SPEC, DEFAULT_PRICING).total);
  });
});

describe("shipping markup", () => {
  it("defaults to a handling charge rather than zero", () => {
    // Passing the raw carrier rate through means the shop pays for boxes and labour on every order.
    expect(DEFAULT_PRICING.shippingMarkup).toBeGreaterThan(0);
  });

  it("reads a stored value", () => {
    expect(parsePricingSettings([{ key: PRICING_KEYS.shippingMarkup, value: "4.5" }]).shippingMarkup).toBe(4.5);
  });

  it("allows zero, which is a legitimate choice", () => {
    expect(parsePricingSettings([{ key: PRICING_KEYS.shippingMarkup, value: "0" }]).shippingMarkup).toBe(0);
  });

  it("refuses a value large enough to look like a typo", () => {
    expect(parsePricingSettings([{ key: PRICING_KEYS.shippingMarkup, value: "500" }]).shippingMarkup)
      .toBe(DEFAULT_PRICING.shippingMarkup);
  });
});
