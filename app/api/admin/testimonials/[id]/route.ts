import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { db } from "@/lib/prisma";

const schema = z.object({
  approved: z.boolean().optional(),
  featured: z.boolean().optional(),
  text: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const t = await db.testimonial.update({ where: { id }, data: parsed.data });
  return NextResponse.json(t);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  await db.testimonial.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
