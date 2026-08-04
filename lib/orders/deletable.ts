import type { OrderStatus } from "@prisma/client";

/**
 * Whether an order can be deleted outright.
 *
 * Deleting is permanent and takes the order's items and history with it, so it is only offered for
 * orders that never took money: abandoned drafts, checkouts that were never completed, and orders
 * that were cancelled or already refunded. An order still holding a customer's money has to be
 * refunded first - otherwise the only record of a payment that Stripe will happily confirm ever
 * happened is gone, which is the kind of gap that surfaces months later in a chargeback.
 */
export function canDelete(order: { status: OrderStatus; amountPaid: number | null }): boolean {
  if (SAFE_TO_DELETE.includes(order.status)) return true;
  // A completed $0 order took no money, so there is nothing to preserve.
  return (order.amountPaid ?? 0) === 0;
}

const SAFE_TO_DELETE: OrderStatus[] = ["DRAFT", "PENDING", "CANCELLED", "REFUNDED"];

/** Why a delete was refused, phrased for the person clicking the button. */
export function deleteBlockedReason(order: { status: OrderStatus; amountPaid: number | null }): string | null {
  if (canDelete(order)) return null;
  return `This order holds $${(order.amountPaid ?? 0).toFixed(2)} of the customer's money. Refund it first, then delete.`;
}

/** Whether there is a payment that could still be sent back. */
export function canRefund(order: {
  status: OrderStatus;
  amountPaid: number | null;
  stripeSessionId: string | null;
}): boolean {
  return order.status !== "REFUNDED" && (order.amountPaid ?? 0) > 0 && Boolean(order.stripeSessionId);
}
