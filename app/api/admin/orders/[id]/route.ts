import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { logAudit } from "@/lib/audit";
import { recordOrderEvent, STATUS_LABELS } from "@/lib/orders/events";
import { deleteBlockedReason } from "@/lib/orders/deletable";
import { db } from "@/lib/prisma";

const schema = z.object({
  status: z.enum(["DRAFT", "PENDING", "PAID", "IN_PROGRESS", "REVIEW", "REVISION", "COMPLETE", "CANCELLED", "REFUNDED"]).optional(),
  /** Visible to the customer on their order page. */
  notes: z.string().max(5000).optional(),
  /** Staff-only. Never rendered on a customer-facing page. */
  internalNotes: z.string().max(5000).optional(),
  trackingCarrier: z.string().max(60).optional(),
  trackingNumber: z.string().max(120).optional(),
  /** A free-text line added straight to the timeline, for anything the fields don't cover. */
  timelineNote: z.string().min(1).max(1000).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const before = await db.order.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { timelineNote, ...fields } = parsed.data;

  // Entering a tracking number is what "shipped" means in practice, so stamp the despatch date the
  // first time one appears rather than asking the shop to remember a separate button.
  const nowShipping = Boolean(fields.trackingNumber?.trim()) && !before.trackingNumber;

  const after = await db.order.update({
    where: { id },
    data: { ...fields, ...(nowShipping ? { shippedAt: new Date() } : {}) },
  });

  const actor = { id: user!.id, name: user!.name, email: user!.email };

  if (fields.status && fields.status !== before.status) {
    await recordOrderEvent({
      orderId: id,
      kind: "status",
      status: after.status,
      message: `Status changed from ${STATUS_LABELS[before.status]} to ${STATUS_LABELS[after.status]}`,
      actor,
    });
  }

  if (nowShipping) {
    const carrier = after.trackingCarrier?.trim();
    await recordOrderEvent({
      orderId: id,
      kind: "shipped",
      message: carrier
        ? `Despatched via ${carrier}, tracking ${after.trackingNumber}`
        : `Despatched, tracking ${after.trackingNumber}`,
      actor,
    });
  }

  if (timelineNote?.trim()) {
    await recordOrderEvent({ orderId: id, kind: "note", message: timelineNote.trim(), actor });
  }

  // The timeline is the operational story; the audit log is the tamper-evident record of who
  // changed what. They answer different questions, so both are written.
  await logAudit({
    userId: user!.id,
    action: "order.update",
    entity: "Order",
    entityId: id,
    before: { status: before.status, notes: before.notes, internalNotes: before.internalNotes, trackingNumber: before.trackingNumber },
    after: { status: after.status, notes: after.notes, internalNotes: after.internalNotes, trackingNumber: after.trackingNumber },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json(after);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true, packageTier: true } },
      user: true,
      project: true,
      events: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

/**
 * Permanently removes an order, along with its items, history and design job.
 *
 * Uploaded customer files are detached rather than destroyed (Upload.orderId is set null by the
 * schema), because those belong to the customer and may be referenced by another order.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const order = await db.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const blocked = deleteBlockedReason(order);
  if (blocked) return NextResponse.json({ error: blocked }, { status: 409 });

  // Captured before the row disappears - the audit entry is the only trace left afterwards.
  await logAudit({
    userId: user!.id,
    action: "order.delete",
    entity: "Order",
    entityId: id,
    before: {
      status: order.status,
      total: order.total,
      amountPaid: order.amountPaid,
      email: order.guestEmail,
      stripeSessionId: order.stripeSessionId,
      createdAt: order.createdAt,
    },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  await db.order.delete({ where: { id } });

  return NextResponse.json({ deleted: id });
}
