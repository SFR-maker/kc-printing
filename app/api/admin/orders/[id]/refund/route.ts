import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { logAudit } from "@/lib/audit";
import { canRefund } from "@/lib/orders/deletable";
import { recordOrderEvent } from "@/lib/orders/events";
import { db } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { sendRefundConfirmation } from "@/lib/resend";

const schema = z.object({
  /** Dollars. Omit for a full refund of whatever is left. */
  amount: z.number().positive().optional(),
  reason: z.enum(["duplicate", "fraudulent", "requested_by_customer"]).optional(),
});

/**
 * Sends a customer's money back through Stripe.
 *
 * The refund is created at Stripe first and the order is only updated once Stripe confirms it. Doing
 * it the other way round would leave an order marked REFUNDED whenever the Stripe call failed, and
 * nobody would ever go looking for the money that was never actually returned.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const order = await db.order.findUnique({ where: { id }, include: { user: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (!canRefund(order)) {
    return NextResponse.json(
      {
        error:
          order.status === "REFUNDED"
            ? "This order has already been refunded."
            : "There is nothing to refund — no payment was ever taken on this order.",
      },
      { status: 400 }
    );
  }

  const requested = parsed.data.amount ?? order.amountPaid ?? 0;
  if (requested > (order.amountPaid ?? 0)) {
    return NextResponse.json(
      { error: `You cannot refund more than the $${(order.amountPaid ?? 0).toFixed(2)} that was charged.` },
      { status: 400 }
    );
  }

  // The session only carries a payment intent once it has actually been paid; refunds attach to the
  // intent, not the checkout session.
  let paymentIntentId: string | null = null;
  try {
    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId!);
    paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`Could not load Stripe session for order ${id}:`, detail);
    return NextResponse.json({ error: "Could not reach Stripe to look up this payment.", detail }, { status: 502 });
  }

  if (!paymentIntentId) {
    return NextResponse.json(
      { error: "Stripe has no payment recorded against this order, so there is nothing to refund." },
      { status: 400 }
    );
  }

  let refundId: string;
  let refunded: number;
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(requested * 100),
      reason: parsed.data.reason ?? "requested_by_customer",
      metadata: { orderId: id, refundedBy: user!.email },
    });
    refundId = refund.id;
    refunded = (refund.amount ?? 0) / 100;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`Stripe refused the refund for order ${id}:`, detail);
    return NextResponse.json({ error: "Stripe refused the refund.", detail }, { status: 502 });
  }

  const remaining = Math.round(((order.amountPaid ?? 0) - refunded) * 100) / 100;
  const updated = await db.order.update({
    where: { id },
    data: {
      // A partial refund leaves the order live with less money against it; a full one closes it.
      status: remaining <= 0 ? "REFUNDED" : order.status,
      amountPaid: remaining,
      stripePaymentStatus: remaining <= 0 ? "refunded" : "partially_refunded",
    },
  });

  await recordOrderEvent({
    orderId: id,
    kind: "refund",
    status: updated.status,
    message:
      remaining <= 0
        ? `Refunded $${refunded.toFixed(2)} in full via Stripe`
        : `Refunded $${refunded.toFixed(2)} of $${(order.amountPaid ?? 0).toFixed(2)}, leaving $${remaining.toFixed(2)}`,
    actor: { id: user!.id, name: user!.name, email: user!.email },
  });

  // After Stripe has confirmed, so we never tell someone money is coming back when it is not.
  const customerEmail = order.user?.email ?? order.guestEmail;
  if (customerEmail) {
    await sendRefundConfirmation({
      customerName: order.user?.name ?? order.shippingName ?? "there",
      customerEmail,
      orderId: id,
      amount: refunded,
      full: remaining <= 0,
    });
  }

  await logAudit({
    userId: user!.id,
    action: "order.refund",
    entity: "Order",
    entityId: id,
    before: { status: order.status, amountPaid: order.amountPaid },
    after: { status: updated.status, amountPaid: remaining, refundId },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ refundId, refunded, remaining, status: updated.status });
}
