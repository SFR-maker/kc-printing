import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/prisma";
import { PRICING_TAG } from "@/lib/cache-tags";

const schema = z.object({ key: z.string().min(1), value: z.string() });

export async function PATCH(req: Request) {
  const { error, user: admin } = await requireAdmin();
  if (error) return error;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const before = await db.siteSetting.findUnique({ where: { key: parsed.data.key } });
  // Upsert rather than update: pricing settings have no seeded row until the first time they are
  // edited, and update would throw on a key that does not exist yet.
  const setting = await db.siteSetting.upsert({
    where: { key: parsed.data.key },
    update: { value: parsed.data.value },
    create: { key: parsed.data.key, value: parsed.data.value },
  });

  await logAudit({
    userId: admin!.id, action: "setting.update", entity: "SiteSetting", entityId: setting.key,
    before: before ? { key: before.key, value: before.value } : undefined,
    after: { key: setting.key, value: setting.value },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  // SiteSetting backs getPricingSettings, which is cached for 5 minutes.
  revalidateTag(PRICING_TAG, "max");

  return NextResponse.json(setting);
}

export async function GET() {
  const { error, user: admin } = await requireAdmin();
  if (error) return error;
  const settings = await db.siteSetting.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json(settings);
}
