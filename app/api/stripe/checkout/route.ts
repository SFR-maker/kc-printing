import { NextResponse } from "next/server";
import { z } from "zod";
import type Stripe from "stripe";
import { safeClerkUserId } from "@/lib/safe-auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/app-url";
import { buildStripeLineItems, lineItemsTotalCents } from "@/lib/pricing/line-items";
import { buildShippingOptions, FREE_TEST_SHIPPING } from "@/lib/shipping/rates";
import { getPricingSettings } from "@/lib/pricing/settings-server";

const schema = z.object({
  orderId: z.string().min(1),
  couponCode: z.string().optional(),
});

export async function POST(req: Request) {
  // Guest checkout: no account required to pay, matching /api/orders. Ownership here is only
  // meaningful for signed-in customers (an order id is an unguessable cuid, so a guest checking
  // out their own just-created order without a session is expected, not a security gap).
  const clerkId = await safeClerkUserId();
  const user = clerkId ? await db.user.findUnique({ where: { clerkId } }) : null;

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
  // A guest order (order.userId is null) can be paid by anyone holding its id; a signed-in
  // customer's order can only be paid by that same account.
  if (order.userId && order.userId !== user?.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });


  const lineItems = buildStripeLineItems(
    order.items.map((item: { product: { name: string; description: string }; packageTier: { name: string } | null; price: number; quantity: number }) => ({
      price: item.price,
      quantity: item.quantity,
      productName: item.product.name,
      productDescription: item.product.description,
      packageTierName: item.packageTier?.name ?? null,
    }))
  );

  // The amount Stripe will charge must equal the total we recorded and showed the customer. This
  // exists because it did not: OrderItem.quantity (250 cards) was being passed to Stripe as the
  // line quantity while OrderItem.price already held the whole line total, so a $21 order for 250
  // cards was billed at $5,250. Refuse to open a session rather than overcharge.
  const expectedCents = Math.round(order.total * 100);
  const chargeCents = lineItemsTotalCents(lineItems);
  if (chargeCents !== expectedCents) {
    console.error(
      `Refusing checkout for order ${orderId}: line items total ${chargeCents} cents but order total is ${expectedCents} cents`
    );
    return NextResponse.json(
      { error: "This order's pricing doesn't add up. Please contact us at (816) 521-0462." },
      { status: 500 }
    );
  }

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

  // Wrapped so a Stripe rejection surfaces as a readable reason instead of an unhandled 500. This
  // call previously threw `url_invalid` on success_url for every order and the customer only ever
  // saw "we couldn't start checkout", with nothing in the response to say why.
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
        line_items: lineItems as Stripe.Checkout.SessionCreateParams.LineItem[],
      discounts,
      success_url: absoluteUrl("success?session_id={CHECKOUT_SESSION_ID}"),
      cancel_url: absoluteUrl("cancel"),
      metadata: { orderId, userId: user?.id ?? "" },
      customer_email: user?.email ?? order.guestEmail ?? undefined,
      // Printed cards have to be posted somewhere. Collecting the address here rather than in our own
      // form means Stripe validates it, offers autofill, and we never hold it before payment. The
      // webhook copies it onto the order once the session completes.
      shipping_address_collection: { allowed_countries: ["US"] },
      phone_number_collection: { enabled: true },
      // Sales tax is worked out by Stripe from the address the customer enters above. It only
      // charges tax where the account holds an active tax registration; with none configured it
      // resolves to zero rather than failing, so this is safe to ship ahead of registering.
      automatic_tax: { enabled: true },
      // Flat tiers rather than live carrier quotes. Stripe renders each one with a delivery date
      // range worked out against the customer's own calendar, and taxes the shipping line according
      // to the destination - some states tax carriage, some do not.
      // A zero-value order is a gated test order (see lib/pricing/test-order.ts) - nothing else in
      // the shop totals zero. Charging carriage on it would defeat the point, so it ships free.
      // When the customer priced shipping before checkout, that exact option is the only one
      // offered - re-presenting a menu here would let them pay a different figure to the one the
      // order was quoted at, and the order record would no longer match the charge.
      shipping_options: buildShippingOptions(
        order.total === 0
          ? [FREE_TEST_SHIPPING]
          : order.shippingLabel && order.shippingPrice != null
            ? [{
                id: "chosen",
                label: order.shippingLabel,
                price: order.shippingPrice,
                minBusinessDays: 1,
                maxBusinessDays: 10,
                recommended: true,
              }]
            : (await getPricingSettings()).shippingTiers
      ),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("Stripe checkout session creation failed:", detail, err);
    return NextResponse.json({ error: "Could not start checkout.", detail }, { status: 502 });
  }

  await db.order.update({
    where: { id: orderId },
    data: { stripeSessionId: session.id, status: "PENDING" },
  });

  return NextResponse.json({ url: session.url });
}
