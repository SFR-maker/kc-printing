import { describe, it, expect } from "vitest";
import { calculatePrice } from "@/lib/pricing";

describe("calculatePrice", () => {
  it("returns correct subtotal with no add-ons", () => {
    const result = calculatePrice({ packagePrice: 100, addOnPrices: [] });
    expect(result.subtotal).toBe(100);
    expect(result.discount).toBe(0);
    expect(result.total).toBe(100);
  });

  it("includes add-ons in subtotal", () => {
    const result = calculatePrice({ packagePrice: 100, addOnPrices: [25, 15] });
    expect(result.subtotal).toBe(140);
    expect(result.total).toBe(140);
  });

  it("applies percent coupon correctly", () => {
    const result = calculatePrice({ packagePrice: 200, addOnPrices: [], couponDiscount: 20, couponType: "PERCENT" });
    expect(result.discount).toBe(40);
    expect(result.total).toBe(160);
  });

  it("applies fixed coupon correctly", () => {
    const result = calculatePrice({ packagePrice: 200, addOnPrices: [], couponDiscount: 30, couponType: "FIXED" });
    expect(result.discount).toBe(30);
    expect(result.total).toBe(170);
  });

  it("caps fixed coupon at subtotal", () => {
    const result = calculatePrice({ packagePrice: 20, addOnPrices: [], couponDiscount: 50, couponType: "FIXED" });
    expect(result.total).toBe(0);
  });

  it("multiplies by quantity", () => {
    const result = calculatePrice({ packagePrice: 50, addOnPrices: [10], quantity: 3 });
    expect(result.subtotal).toBe(180);
  });

  it("rounds to 2 decimal places", () => {
    const result = calculatePrice({ packagePrice: 100, addOnPrices: [], couponDiscount: 33.333, couponType: "PERCENT" });
    expect(result.discount).toBe(33.33);
    expect(result.total).toBe(66.67);
  });
});
