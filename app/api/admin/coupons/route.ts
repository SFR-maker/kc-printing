import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/prisma";

const schema = z.object({
  code: z.string().min(3).max(20).toUpperCase(),
  discount: z.number().positive(),
  type: z.enum(["PERCENT", "FIXED"]),
  usageLimit: z.number().int().optional(),
  expiresAt: z.string().optional(),
});

export async function POST(req: Request) {
  const { error, user: admin } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await db.coupon.findUnique({ where: { code: parsed.data.code } });
  if (existing) return NextResponse.json({ error: "Coupon code already exists" }, { status: 409 });

  const coupon = await db.coupon.create({
    data: {
      ...parsed.data,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
  });

  await logAudit({
    userId: admin!.id, action: "coupon.create", entity: "Coupon", entityId: coupon.id,
    after: { code: coupon.code, discount: coupon.discount, type: coupon.type },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json(coupon, { status: 201 });
}
