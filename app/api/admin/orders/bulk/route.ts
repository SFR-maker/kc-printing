import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { logAudit } from "@/lib/audit";
import { deleteBlockedReason } from "@/lib/orders/deletable";
import { db } from "@/lib/prisma";

const schema = z.object({
  action: z.literal("delete"),
  // Capped so one request cannot quietly wipe the table.
  ids: z.array(z.string().min(1)).min(1).max(200),
});

/**
 * Deletes several orders at once from the list view.
 *
 * Each order is checked individually and the ones that pass are deleted, rather than refusing the
 * whole batch because one of them held money. Someone clearing out twenty abandoned drafts should
 * not have to hunt for the single order that cannot go - they should get nineteen gone and a clear
 * sentence about the twentieth.
 */
export async function POST(req: Request) {
  const { error, user } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const orders = await db.order.findMany({ where: { id: { in: parsed.data.ids } } });

  const deletable: typeof orders = [];
  const refused: { id: string; reason: string }[] = [];
  for (const order of orders) {
    const blocked = deleteBlockedReason(order);
    if (blocked) refused.push({ id: order.id, reason: blocked });
    else deletable.push(order);
  }

  if (deletable.length > 0) {
    // Written before the rows go, since afterwards this is the only record they existed.
    await logAudit({
      userId: user!.id,
      action: "order.bulkDelete",
      entity: "Order",
      before: {
        orders: deletable.map((o) => ({
          id: o.id, status: o.status, total: o.total, email: o.guestEmail, createdAt: o.createdAt,
        })),
      },
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    });

    await db.order.deleteMany({ where: { id: { in: deletable.map((o) => o.id) } } });
  }

  return NextResponse.json({
    deleted: deletable.length,
    refused,
    // Ids that matched nothing - already gone, or never existed.
    missing: parsed.data.ids.filter((id) => !orders.some((o) => o.id === id)),
  });
}
