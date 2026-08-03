import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/prisma";

export * from "./status";

/**
 * Records something that happened to an order.
 *
 * Writes never throw outward. A timeline entry is valuable but it is not worth failing a payment
 * webhook or a status update over - losing one line of history is a far smaller problem than an
 * order stuck in the wrong state because the audit write fell over.
 */
export async function recordOrderEvent(params: {
  orderId: string;
  kind: "created" | "status" | "payment" | "shipped" | "note" | "refund";
  message: string;
  status?: OrderStatus | null;
  /** Omit for events caused by Stripe or the public order API rather than a person. */
  actor?: { id: string; name: string | null; email: string } | null;
}): Promise<void> {
  try {
    await db.orderEvent.create({
      data: {
        orderId: params.orderId,
        kind: params.kind,
        status: params.status ?? null,
        message: params.message,
        actorId: params.actor?.id ?? null,
        actorName: params.actor ? (params.actor.name ?? params.actor.email) : null,
      },
    });
  } catch (err) {
    console.error(`Could not record ${params.kind} event for order ${params.orderId}:`, err);
  }
}

