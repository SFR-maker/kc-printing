import { NextResponse } from "next/server";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/prisma";
import { sendAdminOrderReminder } from "@/lib/resend";
import { recordOrderEvent } from "@/lib/orders/events";

// Orders in these statuses are genuinely waiting on the shop, so a paid order sitting unopened in
// one of them is the failure mode this reminder exists for. DRAFT was never placed; COMPLETE,
// CANCELLED and REFUNDED are done - nagging staff about those trains them to ignore the reminder.
const NEEDS_ATTENTION: OrderStatus[] = ["PENDING", "PAID", "IN_PROGRESS", "REVIEW", "REVISION"];

/**
 * Runs on a schedule (see vercel.json) and emails every admin address once for each order that has
 * sat unopened in admin for 24+ hours. Idempotent: `reminderSentAt` is stamped on the order the
 * moment the email attempt is made, so a retried or overlapping run can't double-send, and a
 * flaky send simply gets picked up again next run since the stamp is skipped when nothing sent.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stale = await db.order.findMany({
    where: {
      status: { in: NEEDS_ATTENTION },
      adminViewedAt: null,
      reminderSentAt: null,
      createdAt: { lte: cutoff },
    },
    include: { user: true, items: { include: { product: true, packageTier: true } } },
  });

  let sent = 0;
  let failed = 0;

  for (const order of stale) {
    const customerEmail = order.user?.email ?? order.guestEmail;
    const ok = await sendAdminOrderReminder({
      orderId: order.id,
      serviceName: order.items[0]?.product?.name ?? "Order",
      packageName: order.items[0]?.packageTier?.name ?? "",
      total: order.amountPaid ?? order.total,
      customerName: order.user?.name ?? order.shippingName ?? "Guest",
      customerEmail: customerEmail ?? "unknown",
      placedAt: order.createdAt,
    });

    if (ok) {
      sent++;
      await db.order.update({ where: { id: order.id }, data: { reminderSentAt: new Date() } });
      await recordOrderEvent({
        orderId: order.id,
        kind: "note",
        message: "Reminder sent to admin: no one had opened this order 24 hours after it was placed.",
      });
    } else {
      failed++;
    }
  }

  return NextResponse.json({ checked: stale.length, sent, failed });
}
