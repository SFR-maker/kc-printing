import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { logAudit } from "@/lib/audit";
import { recordOrderEvent } from "@/lib/orders/events";
import { db } from "@/lib/prisma";

const schema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "REVIEW", "REVISION", "COMPLETE"]).optional(),
  notes: z.string().max(5000).optional(),
  /** Close out a revision request that has been dealt with. */
  resolveRevisionId: z.string().min(1).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const before = await db.project.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const { resolveRevisionId, ...fields } = parsed.data;

  if (resolveRevisionId) {
    await db.revisionRequest.updateMany({
      // Scoped to this project so an id from elsewhere cannot be closed through this route.
      where: { id: resolveRevisionId, projectId: id },
      data: { status: "RESOLVED" },
    });
  }

  const project = Object.keys(fields).length > 0
    ? await db.project.update({ where: { id }, data: fields })
    : before;

  // The design job and the order are the same piece of work to a customer, so a status change here
  // belongs on the order's timeline too - otherwise the order history has an unexplained gap.
  if (fields.status && fields.status !== before.status) {
    await recordOrderEvent({
      orderId: before.orderId,
      kind: "note",
      message: `Design job moved to ${fields.status.replace("_", " ").toLowerCase()}`,
      actor: { id: user!.id, name: user!.name, email: user!.email },
    });
  }

  await logAudit({
    userId: user!.id,
    action: "project.update",
    entity: "Project",
    entityId: id,
    before: { status: before.status, notes: before.notes },
    after: { ...fields, ...(resolveRevisionId ? { resolvedRevision: resolveRevisionId } : {}) },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json(project);
}
