export interface OrderItemForBilling {
  /**
   * The LINE TOTAL in dollars, not a unit price.
   *
   * This is the whole cost of the item: print run plus design package plus add-ons, already summed
   * in app/api/orders. It is deliberately not per-unit, because business-card pricing is banded
   * (250 cards is not 250x the price of one card) and cannot be expressed as a unit rate.
   */
  price: number;
  /**
   * The physical quantity ordered - 250 cards, 1000 postcards. Reporting and fulfilment data.
   *
   * NEVER pass this to Stripe as `quantity`. Doing so multiplied the line total by the card count
   * and billed $5,250 for a $21 order of 250 cards, and $244,816,000 for a large one.
   */
  quantity: number;
  productName: string;
  productDescription: string;
  packageTierName?: string | null;
}

export interface StripeLineItem {
  price_data: {
    currency: "usd";
    product_data: { name: string; description: string; tax_code: string };
    unit_amount: number;
    /**
     * US sales tax is added on top of the listed price, so every amount here is pre-tax. Stripe
     * requires this to be set explicitly whenever automatic tax is enabled - a price with no
     * tax_behavior is rejected outright.
     */
    tax_behavior: "exclusive";
  };
  quantity: number;
}

/**
 * Stripe tax code for general tangible goods.
 *
 * Printed cards, postcards, banners and signs are physical products shipped to the customer, which
 * is what determines how they are taxed. Design work billed as part of the same line rides along
 * with it rather than being split out as a separate service line.
 */
export const PRINTED_GOODS_TAX_CODE = "txcd_99999999";

/**
 * Converts order items into Stripe Checkout line items.
 *
 * Each item bills exactly once at its line total, so `quantity` is always 1. The physical quantity
 * is surfaced in the description instead, where the customer can see it without it affecting the
 * amount charged.
 */
export function buildStripeLineItems(items: OrderItemForBilling[]): StripeLineItem[] {
  return items.map((item) => {
    const name = `${item.productName}${item.packageTierName ? ` - ${item.packageTierName}` : ""}`;
    const quantityNote =
      item.quantity > 1 ? `Quantity: ${item.quantity.toLocaleString("en-US")}. ` : "";
    return {
      price_data: {
        currency: "usd" as const,
        product_data: {
          name,
          description: `${quantityNote}${item.productDescription}`.substring(0, 200),
          tax_code: PRINTED_GOODS_TAX_CODE,
        },
        unit_amount: Math.round(item.price * 100),
        tax_behavior: "exclusive" as const,
      },
      quantity: 1,
    };
  });
}

/**
 * Pre-tax total in cents, for asserting against the stored order total.
 *
 * Tax is calculated by Stripe from the shipping address at checkout, so it is deliberately not part
 * of this figure - the assertion is about our own arithmetic, not the final charge.
 */
export function lineItemsTotalCents(lineItems: StripeLineItem[]): number {
  return lineItems.reduce((sum, li) => sum + li.price_data.unit_amount * li.quantity, 0);
}
