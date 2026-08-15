import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/prisma";
import { PRICING_TAG } from "@/lib/cache-tags";

const schema = z.object({ price: z.number().positive() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, user: admin } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const before = await db.packageTier.findUnique({ where: { id }, include: { product: true } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pkg = await db.packageTier.update({ where: { id }, data: { price: parsed.data.price } });

  await logAudit({
    userId: admin!.id, action: "pricing.package", entity: "PackageTier", entityId: id,
    before: { name: before.name, product: before.product.name, price: before.price },
    after: { price: pkg.price },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  // Package prices are quoted from cached settings; invalidate so an edit shows at once.
  revalidateTag(PRICING_TAG, "max");

  return NextResponse.json(pkg);
}
