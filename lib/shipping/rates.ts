/**
 * Flat-rate shipping tiers.
 *
 * These are fixed prices per tier, not live carrier quotes. Every figure here is a business
 * decision, so they all live in this one file rather than being scattered through the checkout
 * code - change a number here and it flows to Stripe Checkout and the order summary together.
 *
 * Transit times are the carrier's, measured in business days from despatch. They deliberately
 * exclude production time: a rush print job still ships by whichever tier the customer picks, and
 * conflating the two produces delivery dates the shop cannot honour.
 */
export interface ShippingTier {
  id: string;
  label: string;
  /** Price in whole dollars. Converted to cents at the Stripe boundary. */
  price: number;
  minBusinessDays: number;
  maxBusinessDays: number;
  /** Marks the tier presented as the sensible default. At most one. */
  recommended?: boolean;
}

export const SHIPPING_TIERS: ShippingTier[] = [
  { id: "economy", label: "Economy", price: 6.95, minBusinessDays: 5, maxBusinessDays: 9 },
  { id: "standard", label: "Standard", price: 12.95, minBusinessDays: 3, maxBusinessDays: 6, recommended: true },
  { id: "express", label: "Express", price: 24.95, minBusinessDays: 2, maxBusinessDays: 3 },
  { id: "next-day", label: "Next Day", price: 39.95, minBusinessDays: 1, maxBusinessDays: 1 },
];

/**
 * The only option offered on a zero-value test order.
 *
 * Without it a $0 order still collects $6.95 carriage, which means a real card charge and a real
 * refund every time the upload path is exercised against production.
 */
export const FREE_TEST_SHIPPING: ShippingTier = {
  id: "test-free", label: "Test shipping", price: 0, minBusinessDays: 3, maxBusinessDays: 6,
};

/**
 * Stripe's tax code for shipping and handling.
 *
 * Shipping is taxable in some states and not others. Tagging it correctly lets Stripe Tax decide
 * per destination rather than us guessing, which is why the total is labelled "Shipping (taxable)"
 * in states that tax it.
 */
export const SHIPPING_TAX_CODE = "txcd_92010001";

export interface StripeShippingOption {
  shipping_rate_data: {
    type: "fixed_amount";
    fixed_amount: { amount: number; currency: "usd" };
    display_name: string;
    tax_behavior: "exclusive";
    tax_code: string;
    delivery_estimate: {
      minimum: { unit: "business_day"; value: number };
      maximum: { unit: "business_day"; value: number };
    };
  };
}

/**
 * Stripe shows these after the customer enters an address, with the delivery estimate rendered as
 * a date range against their own calendar. The recommended tier is listed first, since Stripe
 * preselects the first option.
 */
export function buildShippingOptions(tiers: ShippingTier[] = SHIPPING_TIERS): StripeShippingOption[] {
  const ordered = [...tiers].sort((a, b) => Number(b.recommended ?? false) - Number(a.recommended ?? false));
  return ordered.map((tier) => ({
    shipping_rate_data: {
      type: "fixed_amount" as const,
      fixed_amount: { amount: Math.round(tier.price * 100), currency: "usd" as const },
      display_name: tier.label,
      tax_behavior: "exclusive" as const,
      tax_code: SHIPPING_TAX_CODE,
      delivery_estimate: {
        minimum: { unit: "business_day" as const, value: tier.minBusinessDays },
        maximum: { unit: "business_day" as const, value: tier.maxBusinessDays },
      },
    },
  }));
}

/** "3 to 6 business days", or "Next business day" when the range collapses to one. */
export function transitLabel(tier: ShippingTier): string {
  if (tier.minBusinessDays === 1 && tier.maxBusinessDays === 1) return "Next business day";
  if (tier.minBusinessDays === tier.maxBusinessDays) return `${tier.minBusinessDays} business days`;
  return `${tier.minBusinessDays} to ${tier.maxBusinessDays} business days`;
}
