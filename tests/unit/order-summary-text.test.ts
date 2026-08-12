import { describe, it, expect } from "vitest";
import { formatOrderSummary, type OrderSummaryInput } from "@/lib/orders/summary-text";

/**
 * The summary is pasted into a supplier's form, a courier's booking page and replies to customers,
 * so what matters is that it is complete, readable as plain text, and never prints a heading with
 * nothing under it.
 */

const BASE: OrderSummaryInput = {
  id: "clx1234567890abcdefgh",
  createdAt: new Date("2026-08-12T14:30:00Z"),
  status: "PAID",
  total: 84.5,
  amountPaid: 91.45,
  taxAmount: 6.95,
  customerName: "Dana Whitfield",
  customerEmail: "dana@whitfieldrealty.com",
  shippingLines: ["Dana Whitfield", "412 Main St", "Kansas City, MO, 64105"],
  trackingCarrier: "UPS",
  trackingNumber: "1Z999AA10123456784",
  items: [{
    productName: "Business Cards",
    packageName: "Gold",
    quantity: 500,
    price: 84.5,
    specs: ["Rush turnaround", "Rounded corners"],
  }],
  artworkSource: "Customer supplied a print-ready file",
  artworkFileName: "whitfield-card.pdf",
  notes: "Match the navy from their website.",
};

describe("formatOrderSummary", () => {
  const text = formatOrderSummary(BASE);

  it("leads with the order number the shop actually quotes", () => {
    // The short suffix is what appears everywhere else in the admin, so the paste has to match.
    expect(text.split("\n")[0]).toBe("ORDER #ABCDEFGH");
  });

  it("includes everything that gets re-keyed elsewhere", () => {
    for (const needle of [
      "dana@whitfieldrealty.com",
      "412 Main St",
      "1Z999AA10123456784",
      "Business Cards",
      "500",
      "whitfield-card.pdf",
      "Match the navy",
    ]) {
      expect(text, `missing ${needle}`).toContain(needle);
    }
  });

  it("formats money as money", () => {
    expect(text).toContain("$84.50");
    expect(text).toContain("$91.45");
  });

  it("keeps the per-item specs", () => {
    expect(text).toContain("Rush turnaround");
    expect(text).toContain("Rounded corners");
  });

  it("omits sections that have nothing in them", () => {
    const bare = formatOrderSummary({
      ...BASE,
      shippingLines: [],
      trackingNumber: null,
      trackingCarrier: null,
      notes: null,
      artworkFileName: null,
      taxAmount: null,
      amountPaid: null,
    });
    // A heading with nothing under it reads as missing data rather than as absent data.
    expect(bare).not.toContain("DELIVER TO");
    expect(bare).not.toContain("TRACKING");
    expect(bare).not.toContain("NOTES");
    // What is present still is.
    expect(bare).toContain("CUSTOMER");
    expect(bare).toContain("PRINTING");
  });

  it("never leaves a run of blank lines", () => {
    // Dropped sections used to leave gaps behind, which looks like something failed to render.
    const bare = formatOrderSummary({ ...BASE, shippingLines: [], trackingNumber: null, notes: null });
    expect(bare).not.toMatch(/\n{3,}/);
  });

  it("survives an order with nothing optional set at all", () => {
    const minimal = formatOrderSummary({
      ...BASE,
      customerName: null, customerEmail: null, shippingLines: [],
      trackingCarrier: null, trackingNumber: null, items: [],
      artworkFileName: null, notes: null, taxAmount: null, amountPaid: null,
    });
    expect(minimal).toContain("ORDER #");
    expect(minimal.trim().length).toBeGreaterThan(0);
  });
});
