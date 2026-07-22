import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { CardSideSchema } from "@/lib/business-card/schema";

const updateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  front: CardSideSchema.optional(),
  back: CardSideSchema.optional(),
  thumbnailFront: z.string().nullable().optional(),
  thumbnailBack: z.string().nullable().optional(),
});

async function getOwnedDesign(id: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), design: null };

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { error: NextResponse.json({ error: "User not found" }, { status: 404 }), design: null };

  const design = await db.cardDesign.findUnique({ where: { id } });
  if (!design || design.userId !== user.id) {
    return { error: NextResponse.json({ error: "Design not found" }, { status: 404 }), design: null };
  }

  return { error: null, design };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, design } = await getOwnedDesign(id);
  if (error) return error;
  return NextResponse.json({ design });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await getOwnedDesign(id);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid update", details: parsed.error.flatten() }, { status: 400 });

  const updated = await db.cardDesign.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ id: updated.id, updatedAt: updated.updatedAt });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await getOwnedDesign(id);
  if (error) return error;

  await db.cardDesign.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
