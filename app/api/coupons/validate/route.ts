import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/requireAdmin";

export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.toUpperCase();

  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const coupon = await db.coupon.findUnique({ where: { code, active: true } });

  if (!coupon) return NextResponse.json({ valid: false, error: "Invalid or expired coupon" }, { status: 404 });
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, error: "Coupon has expired" }, { status: 400 });
  }
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return NextResponse.json({ valid: false, error: "Coupon usage limit reached" }, { status: 400 });
  }

  return NextResponse.json({
    valid: true,
    discount: coupon.discount,
    type: coupon.type,
    code: coupon.code,
  });
}
