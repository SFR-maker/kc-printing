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
    product_data: { name: string; description: string };
    unit_amount: number;
  };
  quantity: number;
}

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
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: 1,
    };
  });
}

/** Total in cents that Stripe will charge, for asserting against the stored order total. */
export function lineItemsTotalCents(lineItems: StripeLineItem[]): number {
  return lineItems.reduce((sum, li) => sum + li.price_data.unit_amount * li.quantity, 0);
}
