import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { safeClerkUserId } from "@/lib/safe-auth";

/**
 * Orders that exist but have not been paid for.
 *
 * Two jobs, and the second is the one that keeps the cart honest.
 *
 * For a signed-in customer it lists their own outstanding orders from the database, so an
 * abandoned checkout is still there on a different device or after clearing the browser.
 *
 * For everyone, it filters a list of ids the caller already holds: the cart remembers order ids in
 * localStorage, and those go stale the moment a payment succeeds - the webhook flips the order to
 * PAID, but nothing tells the browser. Without this the customer would keep seeing "finish paying"
 * for something they have already paid for, which is worse than not having a cart at all.
 *
 * Guest orders are only ever returned when the caller names the id. An id is a cuid, unguessable,
 * and the person holding it is the person who created it - the same assumption the Stripe session
 * id makes on the success page. Nothing here enumerates guest orders, and nothing returns an order
 * belonging to a signed-in user to anyone else.
 */
export const dynamic = "force-dynamic";

/** Statuses that mean "money has not changed hands yet". */
const UNPAID = ["DRAFT", "PENDING"] as const;

export interface PendingOrderSummary {
  id: string;
  service: string;
  total: number;
  createdAt: string;
}

export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);

  const clerkId = await safeClerkUserId();
  const user = clerkId ? await db.user.findUnique({ where: { clerkId }, select: { id: true } }) : null;

  if (!user && ids.length === 0) return NextResponse.json({ orders: [] });

  const orders = await db.order.findMany({
    where: {
      status: { in: [...UNPAID] },
      OR: [
        // Everything this signed-in customer still owes for...
        ...(user ? [{ userId: user.id }] : []),
        // ...plus any order the caller can already name, which covers guest checkout.
        ...(ids.length ? [{ id: { in: ids } }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      total: true,
      createdAt: true,
      userId: true,
      items: { select: { product: { select: { slug: true } } }, take: 1 },
    },
  });

  const summaries: PendingOrderSummary[] = orders
    // An id supplied by the caller must not reveal somebody else's account order.
    .filter((o) => !o.userId || o.userId === user?.id)
    .map((o) => ({
      id: o.id,
      service: o.items[0]?.product?.slug ?? "business-cards",
      total: o.total,
      createdAt: o.createdAt.toISOString(),
    }));

  return NextResponse.json({ orders: summaries });
}
