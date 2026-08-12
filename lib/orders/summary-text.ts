/**
 * An order as plain text, for pasting somewhere that is not this website.
 *
 * The shop re-keys order details constantly: into the supplier's order form, into a courier's
 * booking page, into a reply to the customer. Doing that from the screen means reading a value,
 * remembering it, and typing it somewhere else - which is where a transposed digit in a postcode or
 * a tracking number comes from.
 *
 * Deliberately plain text rather than JSON or a table: it has to survive being pasted into an email
 * body, a text field on someone else's website, and a chat message, none of which keep formatting.
 */

export interface OrderSummaryInput {
  id: string;
  createdAt: Date;
  status: string;
  total: number;
  amountPaid: number | null;
  taxAmount: number | null;
  customerName: string | null;
  customerEmail: string | null;
  shippingLines: string[];
  trackingCarrier: string | null;
  trackingNumber: string | null;
  items: {
    productName: string;
    packageName: string | null;
    quantity: number;
    price: number;
    /** Spec lines already rendered for display, e.g. "16 pt. Matte", "Rounded corners". */
    specs: string[];
  }[];
  artworkSource: string;
  artworkFileName: string | null;
  notes: string | null;
}

function money(n: number | null | undefined): string {
  if (n == null) return "—";
  return `$${n.toFixed(2)}`;
}

/** Drops empty sections rather than printing headings with nothing under them. */
function section(heading: string, lines: (string | null | undefined)[]): string | null {
  const kept = lines.filter((l): l is string => Boolean(l && l.trim()));
  if (kept.length === 0) return null;
  return `${heading}\n${kept.map((l) => `  ${l}`).join("\n")}`;
}

export function formatOrderSummary(o: OrderSummaryInput): string {
  const parts: (string | null)[] = [
    `ORDER #${o.id.slice(-8).toUpperCase()}`,
    `Placed ${o.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
    `Status: ${o.status}`,
    "",
    section("CUSTOMER", [
      o.customerName,
      o.customerEmail,
    ]),
    section("DELIVER TO", o.shippingLines),
    section("TRACKING", [
      o.trackingNumber ? `${o.trackingCarrier ?? "Carrier"}: ${o.trackingNumber}` : null,
    ]),
    section("PRINTING", o.items.flatMap((i) => [
      `${i.productName}${i.packageName ? ` — ${i.packageName}` : ""}`,
      `  Quantity: ${i.quantity.toLocaleString("en-US")}`,
      ...i.specs.map((s) => `  ${s}`),
      `  Line total: ${money(i.price)}`,
    ])),
    section("ARTWORK", [
      o.artworkSource,
      o.artworkFileName,
    ]),
    section("TOTALS", [
      `Order total: ${money(o.total)}`,
      o.taxAmount != null ? `Sales tax: ${money(o.taxAmount)}` : null,
      o.amountPaid != null ? `Charged: ${money(o.amountPaid)}` : null,
    ]),
    section("NOTES", [o.notes]),
  ];

  return parts.filter((p) => p !== null).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
