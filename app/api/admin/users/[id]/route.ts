import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/prisma";

const schema = z.object({
  role: z.enum(["USER", "ADMIN", "SUPER_ADMIN"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, user: admin } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const before = await db.user.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // A super admin demoting themselves would lock the shop out of its own settings, and only another
  // super admin could undo it. Refuse rather than let one careless click do that.
  if (parsed.data.role && before.id === admin!.id && parsed.data.role !== before.role) {
    return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
  }

  const user = await db.user.update({ where: { id }, data: parsed.data });

  await logAudit({
    userId: admin!.id, action: "user.role", entity: "User", entityId: id,
    before: { email: before.email, role: before.role },
    after: { role: user.role },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json(user);
}
