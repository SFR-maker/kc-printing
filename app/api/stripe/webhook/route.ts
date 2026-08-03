import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/prisma";
import { sendOrderConfirmation, sendAdminNewOrder } from "@/lib/resend";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET ?? "");
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    // Guest orders have no userId in metadata (empty string, see app/api/stripe/checkout) — that's
    // expected, not a reason to skip marking the order paid. Previously this whole block required
    // both orderId AND userId, so a guest's payment was taken but the order was never marked PAID,
    // no confirmation email sent, and no fulfillment record created.
    const userId = session.metadata?.userId || null;

    if (orderId) {
      // Stripe collects and validates the delivery address during Checkout, so this is the address
      // the customer actually paid against. Copy it onto the order for fulfilment. `collected_information`
      // is the current home for this; `shipping_details` is the older field, so read either.
      // Typed structurally rather than off Stripe.Checkout.Session: this SDK version does not export
      // a ShippingDetails type, and the field moved between API versions.
      type CollectedShipping = {
        name?: string | null;
        address?: {
          line1?: string | null;
          line2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string | null;
        } | null;
      };
      const withShipping = session as unknown as {
        collected_information?: { shipping_details?: CollectedShipping | null } | null;
        shipping_details?: CollectedShipping | null;
      };
      const shipping = withShipping.collected_information?.shipping_details ?? withShipping.shipping_details ?? null;
      const address = shipping?.address;

      const order = await db.order.update({
        where: { id: orderId },
        data: {
          status: "PAID",
          stripePaymentStatus: "paid",
          ...(shipping
            ? {
                shippingName: shipping.name ?? null,
                shippingLine1: address?.line1 ?? null,
                shippingLine2: address?.line2 ?? null,
                shippingCity: address?.city ?? null,
                shippingState: address?.state ?? null,
                shippingPostalCode: address?.postal_code ?? null,
                shippingCountry: address?.country ?? null,
              }
            : {}),
        },
      });

      // Project tracking (the account-dashboard timeline) only applies to signed-in customers who
      // have somewhere to view it — guest orders still get marked PAID and emailed above/below,
      // just without a Project row.
      if (order.id && userId) {
        await db.project.upsert({
          where: { orderId },
          update: {},
          create: {
            orderId,
            userId,
            status: "PENDING",
            timeline: [{ status: "PENDING", note: "Order received and payment confirmed.", timestamp: new Date().toISOString() }],
          },
        });
      }

      if (order.couponId) {
        await db.coupon.update({
          where: { id: order.couponId },
          data: { usageCount: { increment: 1 } },
        });
      }

      const fullOrder = await db.order.findUnique({
        where: { id: orderId },
        include: { user: true, items: { include: { product: true, packageTier: true } } },
      });
      const customerEmail = fullOrder?.user?.email ?? fullOrder?.guestEmail;
      if (customerEmail) {
        const emailData = {
          customerName: fullOrder?.user?.name ?? customerEmail,
          customerEmail,
          orderId,
          serviceName: fullOrder?.items[0]?.product?.name ?? "Design Service",
          packageName: fullOrder?.items[0]?.packageTier?.name ?? "",
          total: fullOrder?.total ?? 0,
        };
        await Promise.all([sendOrderConfirmation(emailData), sendAdminNewOrder(emailData)]);
      }
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const sessions = await stripe.checkout.sessions.list({ payment_intent: intent.id });
    const session = sessions.data[0];
    if (session?.metadata?.orderId) {
      await db.order.update({
        where: { id: session.metadata.orderId },
        data: { stripePaymentStatus: "failed" },
      });
    }
  }

  return NextResponse.json({ received: true });
}
