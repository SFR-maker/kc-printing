import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const template = await db.cardTemplate.findUnique({ where: { slug } });
  if (!template || !template.active) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  return NextResponse.json({ template });
}
