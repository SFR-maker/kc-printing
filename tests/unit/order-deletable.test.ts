import { describe, it, expect } from "vitest";
import { canDelete, canRefund, deleteBlockedReason } from "@/lib/orders/deletable";

describe("canDelete", () => {
  it("allows clearing out abandoned drafts and unfinished checkouts", () => {
    expect(canDelete({ status: "DRAFT", amountPaid: null })).toBe(true);
    expect(canDelete({ status: "PENDING", amountPaid: null })).toBe(true);
  });

  it("refuses an order still holding the customer's money", () => {
    expect(canDelete({ status: "PAID", amountPaid: 21 })).toBe(false);
    expect(canDelete({ status: "IN_PROGRESS", amountPaid: 250 })).toBe(false);
    expect(canDelete({ status: "COMPLETE", amountPaid: 43.44 })).toBe(false);
  });

  it("allows deleting once the money has gone back", () => {
    expect(canDelete({ status: "REFUNDED", amountPaid: 0 })).toBe(true);
    expect(canDelete({ status: "CANCELLED", amountPaid: null })).toBe(true);
  });

  it("allows deleting a completed order that never took money", () => {
    // The free test orders: real rows, real Stripe sessions, nothing owed to anyone.
    expect(canDelete({ status: "COMPLETE", amountPaid: 0 })).toBe(true);
    expect(canDelete({ status: "PAID", amountPaid: 0 })).toBe(true);
  });

  it("treats a PENDING order that somehow took money as protected", () => {
    // Payment landed but the webhook never advanced the status. Deleting it would erase the only
    // record of a charge Stripe will still confirm.
    expect(canDelete({ status: "PAID", amountPaid: 0.01 })).toBe(false);
  });
});

describe("deleteBlockedReason", () => {
  it("says nothing when the delete is allowed", () => {
    expect(deleteBlockedReason({ status: "DRAFT", amountPaid: null })).toBeNull();
  });

  it("names the amount at stake", () => {
    expect(deleteBlockedReason({ status: "PAID", amountPaid: 21 })).toContain("$21.00");
  });
});

describe("canRefund", () => {
  const base = { status: "PAID" as const, amountPaid: 21, stripeSessionId: "cs_live_x" };

  it("offers a refund on a real payment", () => {
    expect(canRefund(base)).toBe(true);
  });

  it("does not offer a refund twice", () => {
    expect(canRefund({ ...base, status: "REFUNDED" })).toBe(false);
  });

  it("does not offer a refund where no money was taken", () => {
    expect(canRefund({ ...base, amountPaid: 0 })).toBe(false);
    expect(canRefund({ ...base, amountPaid: null })).toBe(false);
  });

  it("does not offer a refund with no Stripe session to refund against", () => {
    expect(canRefund({ ...base, stripeSessionId: null })).toBe(false);
  });
});
