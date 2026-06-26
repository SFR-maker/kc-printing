import { NextResponse } from "next/server";
import { z } from "zod";
import type Stripe from "stripe";
import { requireAuth } from "@/lib/auth/requireAdmin";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/prisma";

const schema = z.object({
  orderId: z.string().min(1),
  couponCode: z.string().optional(),
});

export async function POST(req: Request) {
  const { error, user } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { orderId, couponCode } = parsed.data;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true,
          packageTier: true,
        },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.userId !== user!.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items.map((item: { product: { name: string; description: string }; packageTier: { name: string } | null; price: number; quantity: number }) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: `${item.product.name}${item.packageTier ? ` - ${item.packageTier.name}` : ""}`,
        description: item.product.description.substring(0, 200),
      },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity,
  }));

  let discounts: Stripe.Checkout.SessionCreateParams["discounts"];
  if (couponCode) {
    const coupon = await db.coupon.findUnique({ where: { code: couponCode, active: true } });
    if (coupon) {
      const stripeCoupon = await stripe.coupons.create({
        ...(coupon.type === "PERCENT"
          ? { percent_off: coupon.discount }
          : { amount_off: Math.round(coupon.discount * 100), currency: "usd" }),
        duration: "once",
      });
      discounts = [{ coupon: stripeCoupon.id }];
    }
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: lineItems,
    discounts,
    success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/cancel`,
    metadata: { orderId, userId: user!.id },
    customer_email: user!.email,
  });

  await db.order.update({
    where: { id: orderId },
    data: { stripeSessionId: session.id, status: "PENDING" },
  });

  return NextResponse.json({ url: session.url });
}
