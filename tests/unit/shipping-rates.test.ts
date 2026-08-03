import { describe, it, expect } from "vitest";
import {
  SHIPPING_TIERS, SHIPPING_TAX_CODE, buildShippingOptions, transitLabel,
} from "@/lib/shipping/rates";

describe("shipping tiers", () => {
  it("gets faster as it gets more expensive", () => {
    const byPrice = [...SHIPPING_TIERS].sort((a, b) => a.price - b.price);
    for (let i = 1; i < byPrice.length; i++) {
      expect(byPrice[i].maxBusinessDays).toBeLessThanOrEqual(byPrice[i - 1].maxBusinessDays);
    }
  });

  it("has exactly one recommended tier, since Stripe preselects the first option", () => {
    expect(SHIPPING_TIERS.filter((t) => t.recommended)).toHaveLength(1);
  });

  it("uses unique ids", () => {
    expect(new Set(SHIPPING_TIERS.map((t) => t.id)).size).toBe(SHIPPING_TIERS.length);
  });

  it("never quotes a minimum longer than its maximum", () => {
    for (const t of SHIPPING_TIERS) {
      expect(t.minBusinessDays).toBeLessThanOrEqual(t.maxBusinessDays);
      expect(t.minBusinessDays).toBeGreaterThan(0);
    }
  });
});

describe("buildShippingOptions", () => {
  it("puts the recommended tier first so Stripe preselects it", () => {
    const opts = buildShippingOptions();
    const recommended = SHIPPING_TIERS.find((t) => t.recommended);
    expect(opts[0].shipping_rate_data.display_name).toBe(recommended?.label);
  });

  it("converts dollars to cents", () => {
    const opts = buildShippingOptions([
      { id: "x", label: "X", price: 6.95, minBusinessDays: 5, maxBusinessDays: 9 },
    ]);
    expect(opts[0].shipping_rate_data.fixed_amount.amount).toBe(695);
  });

  it("tags shipping so Stripe Tax can decide per destination", () => {
    // Some states tax carriage and some do not; the tax code is what lets Stripe make that call.
    for (const o of buildShippingOptions()) {
      expect(o.shipping_rate_data.tax_code).toBe(SHIPPING_TAX_CODE);
      expect(o.shipping_rate_data.tax_behavior).toBe("exclusive");
    }
  });

  it("carries a delivery estimate so Stripe can show real dates", () => {
    const opts = buildShippingOptions();
    for (const o of opts) {
      const est = o.shipping_rate_data.delivery_estimate;
      expect(est.minimum.unit).toBe("business_day");
      expect(est.maximum.value).toBeGreaterThanOrEqual(est.minimum.value);
    }
  });

  it("emits one option per tier", () => {
    expect(buildShippingOptions()).toHaveLength(SHIPPING_TIERS.length);
  });
});

describe("transitLabel", () => {
  it("collapses a single-day range", () => {
    expect(transitLabel({ id: "n", label: "Next Day", price: 1, minBusinessDays: 1, maxBusinessDays: 1 }))
      .toBe("Next business day");
  });

  it("reads as a range otherwise", () => {
    expect(transitLabel({ id: "s", label: "Standard", price: 1, minBusinessDays: 3, maxBusinessDays: 6 }))
      .toBe("3 to 6 business days");
  });
});
