import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { db } from "@/lib/prisma";

const schema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  imageUrl: z.string().default(""),
  description: z.string().optional(),
  featured: z.boolean().optional(),
});

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const count = await db.portfolioItem.count();
  const item = await db.portfolioItem.create({
    data: {
      title: parsed.data.title,
      category: parsed.data.category,
      imageUrl: parsed.data.imageUrl,
      sortOrder: count,
      ...(parsed.data.description && { description: parsed.data.description }),
      ...(parsed.data.featured !== undefined && { featured: parsed.data.featured }),
    },
  });
  return NextResponse.json(item, { status: 201 });
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const items = await db.portfolioItem.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(items);
}
