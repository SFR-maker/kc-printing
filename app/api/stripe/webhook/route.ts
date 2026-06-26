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
    const userId = session.metadata?.userId;

    if (orderId && userId) {
      const order = await db.order.update({
        where: { id: orderId },
        data: {
          status: "PAID",
          stripePaymentStatus: "paid",
        },
      });

      if (order.id) {
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
      if (fullOrder?.user?.email) {
        const emailData = {
          customerName: fullOrder.user.name ?? fullOrder.user.email,
          customerEmail: fullOrder.user.email,
          orderId,
          serviceName: fullOrder.items[0]?.product?.name ?? "Design Service",
          packageName: fullOrder.items[0]?.packageTier?.name ?? "",
          total: fullOrder.total,
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

export const config = { api: { bodyParser: false } };
