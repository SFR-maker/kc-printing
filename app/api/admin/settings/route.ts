import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { db } from "@/lib/prisma";

const schema = z.object({ key: z.string().min(1), value: z.string() });

export async function PATCH(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const setting = await db.siteSetting.update({ where: { key: parsed.data.key }, data: { value: parsed.data.value } });
  return NextResponse.json(setting);
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const settings = await db.siteSetting.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json(settings);
}
