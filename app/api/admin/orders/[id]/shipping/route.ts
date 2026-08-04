import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { logAudit } from "@/lib/audit";
import { recordOrderEvent } from "@/lib/orders/events";
import { buyLabel, easypostConfigured, getRates, serviceLabel } from "@/lib/shipping/easypost";
import { parcelForProduct } from "@/lib/shipping/parcel";
import { db } from "@/lib/prisma";
import { sendShippingConfirmation } from "@/lib/resend";

/**
 * Live carrier rates and label purchase for one order.
 *
 * Rating happens here rather than at checkout because Stripe collects the delivery address after
 * the session is created - there is no address to rate against until payment completes. Checkout
 * keeps the flat tiers; this is what the shop uses to actually post the parcel.
 */

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("rates") }),
  z.object({ action: z.literal("buy"), shipmentId: z.string().min(1), rateId: z.string().min(1) }),
]);

interface BcSpec {
  sizeId?: number;
  paperId?: number;
  quantity?: number;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAdmin();
  if (error) return error;

  if (!easypostConfigured()) {
    return NextResponse.json(
      { error: "Live shipping is not set up yet. Add EASYPOST_API_KEY and the SHIP_FROM_* variables." },
      { status: 503 }
    );
  }

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const order = await db.order.findUnique({
    where: { id },
    include: { user: true, items: { include: { product: true } } },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (!order.shippingLine1 || !order.shippingCity || !order.shippingState || !order.shippingPostalCode) {
    return NextResponse.json(
      { error: "No delivery address on this order yet. Stripe adds it when the payment completes." },
      { status: 409 }
    );
  }

  const item = order.items[0];
  const spec = (item?.config as { bcSpec?: BcSpec } | null)?.bcSpec;
  const parcel = parcelForProduct(
    item?.product?.slug ?? "",
    spec?.sizeId && spec?.paperId && spec?.quantity
      ? { sizeId: spec.sizeId, paperId: spec.paperId, quantity: spec.quantity }
      : null
  );
  if (!parcel) {
    return NextResponse.json(
      { error: "No parcel size is modelled for this product yet, so a live rate would be a guess. Enter tracking by hand." },
      { status: 422 }
    );
  }

  const to = {
    name: order.shippingName ?? undefined,
    street1: order.shippingLine1,
    street2: order.shippingLine2,
    city: order.shippingCity,
    state: order.shippingState,
    zip: order.shippingPostalCode,
    country: order.shippingCountry ?? "US",
  };

  if (parsed.data.action === "rates") {
    const rates = await getRates(to, parcel);
    if (!rates.length) {
      return NextResponse.json({ error: "No carrier came back with a rate. Check the delivery address." }, { status: 502 });
    }
    return NextResponse.json({
      parcel,
      rates: rates.map((r) => ({ ...r, label: serviceLabel(r) })),
    });
  }

  // Buying spends real money on the EasyPost account, so it is deliberately a separate,
  // explicitly-confirmed action rather than something that happens while fetching rates.
  const label = await buyLabel(parsed.data.shipmentId, parsed.data.rateId);
  if (!label) {
    return NextResponse.json({ error: "The carrier would not issue that label. Try refreshing the rates." }, { status: 502 });
  }

  const carrier = `${label.carrier} ${label.service}`.trim();
  const updated = await db.order.update({
    where: { id },
    data: {
      trackingCarrier: carrier,
      trackingNumber: label.trackingCode,
      // Buying a label is the moment a parcel is committed, so it is the moment it counts as sent.
      shippedAt: order.shippedAt ?? new Date(),
    },
  });

  await recordOrderEvent({
    orderId: id,
    kind: "shipped",
    message: `Label bought from ${carrier} for $${label.price.toFixed(2)} — tracking ${label.trackingCode}`,
    actor: { id: user!.id, name: user!.name, email: user!.email },
  });

  const customerEmail = order.user?.email ?? order.guestEmail;
  if (customerEmail) {
    await sendShippingConfirmation({
      customerName: order.user?.name ?? order.shippingName ?? "there",
      customerEmail,
      orderId: id,
      serviceName: item?.product?.name ?? "print",
      carrier,
      trackingNumber: label.trackingCode,
    });
  }

  await logAudit({
    userId: user!.id,
    action: "order.buyLabel",
    entity: "Order",
    entityId: id,
    after: { carrier, tracking: label.trackingCode, cost: label.price },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({
    trackingNumber: updated.trackingNumber,
    carrier,
    labelUrl: label.labelUrl,
    price: label.price,
  });
}
