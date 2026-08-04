import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().max(60).optional(),
  /** Hiding a product removes it from the shop without deleting any order that referenced it. */
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const before = await db.product.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const product = await db.product.update({ where: { id }, data: parsed.data });

  await logAudit({
    userId: user!.id,
    action: "product.update",
    entity: "Product",
    entityId: id,
    before: { name: before.name, active: before.active, category: before.category, sortOrder: before.sortOrder },
    after: parsed.data,
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json(product);
}
