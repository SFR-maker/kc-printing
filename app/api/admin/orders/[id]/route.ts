import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { db } from "@/lib/prisma";

const schema = z.object({
  status: z.enum(["DRAFT", "PENDING", "PAID", "IN_PROGRESS", "REVIEW", "COMPLETE", "CANCELLED"]).optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const order = await db.order.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(order);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: { items: { include: { product: true, packageTier: true } }, user: true, project: true },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}
