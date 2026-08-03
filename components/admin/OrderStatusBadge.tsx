import type { OrderStatus } from "@prisma/client";
import { STATUS_LABELS } from "@/lib/orders/status";
import { cn } from "@/lib/utils";

/**
 * Colour carries the operational meaning, not the status name.
 *
 * Amber is "you owe this order some attention", green is "money in" or "done", grey is inert, red is
 * money going the other way. Someone scanning the list should be able to find today's work without
 * reading a single label.
 */
const TONE: Record<OrderStatus, string> = {
  DRAFT: "bg-kc-bg text-kc-muted border-kc-border",
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  PAID: "bg-emerald-50 text-emerald-800 border-emerald-200",
  IN_PROGRESS: "bg-sky-50 text-sky-800 border-sky-200",
  REVIEW: "bg-violet-50 text-violet-800 border-violet-200",
  REVISION: "bg-orange-50 text-orange-800 border-orange-200",
  COMPLETE: "bg-kc-sage/20 text-kc-teal border-kc-sage/40",
  CANCELLED: "bg-kc-bg text-kc-muted border-kc-border",
  REFUNDED: "bg-red-50 text-red-800 border-red-200",
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        TONE[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/**
 * Whether the money actually arrived.
 *
 * Order.status is our own workflow state and can be moved by hand; stripePaymentStatus is what the
 * payment processor reports. When they disagree, the shop needs to see it - an order marked PAID
 * that Stripe never charged is exactly the situation worth catching before printing anything.
 */
export function PaymentBadge({
  stripePaymentStatus,
  amountPaid,
}: {
  stripePaymentStatus: string | null;
  amountPaid: number | null;
}) {
  if (!stripePaymentStatus) {
    return <span className="text-xs text-kc-muted">Not charged</span>;
  }
  if (stripePaymentStatus === "no_payment_required") {
    return <span className="text-xs font-medium text-emerald-700">$0 — nothing due</span>;
  }
  if (stripePaymentStatus === "paid") {
    return (
      <span className="text-xs font-medium text-emerald-700">
        Paid{amountPaid != null ? ` $${amountPaid.toFixed(2)}` : ""}
      </span>
    );
  }
  if (stripePaymentStatus === "failed") {
    return <span className="text-xs font-semibold text-red-700">Card declined</span>;
  }
  return <span className="text-xs text-amber-700">{stripePaymentStatus}</span>;
}
