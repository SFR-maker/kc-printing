import { describe, it, expect } from "vitest";
import { buildStripeLineItems, lineItemsTotalCents } from "@/lib/pricing/line-items";

const base = {
  productName: "Business Cards",
  productDescription: "Custom business card design and printing.",
  packageTierName: null,
};

describe("buildStripeLineItems", () => {
  it("bills the line total once, never multiplied by the physical quantity", () => {
    // The regression: 250 cards costing $21 in total were billed at $21 x 250 = $5,250, because
    // OrderItem.quantity was handed to Stripe as the line quantity while OrderItem.price already
    // held the whole line total.
    const [li] = buildStripeLineItems([{ ...base, price: 21, quantity: 250 }]);
    expect(li.quantity).toBe(1);
    expect(li.price_data.unit_amount).toBe(2100);
    expect(lineItemsTotalCents([li])).toBe(2100);
  });

  it("holds for a large run, where the old behaviour was catastrophic", () => {
    // A real session was created for $244,816,000 before this was fixed.
    const items = buildStripeLineItems([{ ...base, price: 9792.64, quantity: 25000 }]);
    expect(lineItemsTotalCents(items)).toBe(979264);
  });

  it("shows the physical quantity in the description instead", () => {
    const [li] = buildStripeLineItems([{ ...base, price: 21, quantity: 250 }]);
    expect(li.price_data.product_data.description).toContain("Quantity: 250");
  });

  it("omits the quantity note for a single item", () => {
    const [li] = buildStripeLineItems([{ ...base, price: 49, quantity: 1 }]);
    expect(li.price_data.product_data.description).not.toContain("Quantity:");
  });

  it("appends the package tier to the product name", () => {
    const [li] = buildStripeLineItems([{ ...base, price: 69, quantity: 1, packageTierName: "Gold" }]);
    expect(li.price_data.product_data.name).toBe("Business Cards - Gold");
  });

  it("keeps Stripe's 200-character description limit", () => {
    const [li] = buildStripeLineItems([
      { ...base, price: 21, quantity: 250, productDescription: "x".repeat(400) },
    ]);
    expect(li.price_data.product_data.description.length).toBeLessThanOrEqual(200);
  });

  it("rounds cents rather than truncating", () => {
    const [li] = buildStripeLineItems([{ ...base, price: 21.005, quantity: 1 }]);
    expect(li.price_data.unit_amount).toBe(2101);
  });

  it("sums multiple items", () => {
    const items = buildStripeLineItems([
      { ...base, price: 21, quantity: 250 },
      { ...base, price: 29, quantity: 1, productName: "Back Side Design" },
    ]);
    expect(lineItemsTotalCents(items)).toBe(5000);
  });
});

describe("tax configuration", () => {
  it("marks prices as tax-exclusive, which automatic tax requires", () => {
    // Stripe rejects a price with no tax_behavior once automatic_tax is enabled, and US sales tax
    // is added on top of the listed price rather than being baked into it.
    const [li] = buildStripeLineItems([{ ...base, price: 21, quantity: 250 }]);
    expect(li.price_data.tax_behavior).toBe("exclusive");
  });

  it("tags every line with the tangible-goods tax code", () => {
    const [li] = buildStripeLineItems([{ ...base, price: 21, quantity: 250 }]);
    expect(li.price_data.product_data.tax_code).toBe("txcd_99999999");
  });

  it("keeps the asserted total pre-tax so the guard checks our arithmetic, not Stripe's", () => {
    const items = buildStripeLineItems([{ ...base, price: 21, quantity: 250 }]);
    expect(lineItemsTotalCents(items)).toBe(2100);
  });
});
