import { db } from "@/lib/prisma";

export async function logAudit(params: {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}) {
  await db.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      before: params.before ? (params.before as object) : undefined,
      after: params.after ? (params.after as object) : undefined,
      ip: params.ip,
    },
  });
}
