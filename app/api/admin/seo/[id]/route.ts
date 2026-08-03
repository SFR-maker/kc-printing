import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/prisma";

const schema = z.object({
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  ogTitle: z.string().optional().nullable(),
  ogDescription: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, user: admin } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const updateData = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined)
  );
  const before = await db.pageSeo.findUnique({ where: { id } });
  const page = await db.pageSeo.update({ where: { id }, data: updateData });

  await logAudit({
    userId: admin!.id, action: "seo.update", entity: "PageSeo", entityId: id,
    before: before ? { path: before.path, title: before.title } : undefined,
    after: { title: page.title }, ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json(page);
}
