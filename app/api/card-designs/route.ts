import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { CardSideSchema } from "@/lib/business-card/schema";
import { safeClerkUserId } from "@/lib/safe-auth";

const createSchema = z.object({
  title: z.string().min(1).max(120).default("Untitled Design"),
  templateId: z.string().nullable().optional(),
  product: z.enum(["BUSINESS_CARD", "POSTCARD", "BANNER"]).default("BUSINESS_CARD"),
  front: CardSideSchema,
  back: CardSideSchema,
  anonymousToken: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid design", details: parsed.error.flatten() }, { status: 400 });

  const clerkId = await safeClerkUserId();
  let userId: string | null = null;
  if (clerkId) {
    const user = await db.user.findUnique({ where: { clerkId } });
    userId = user?.id ?? null;
  }

  const design = await db.cardDesign.create({
    data: {
      userId,
      templateId: parsed.data.templateId ?? null,
      product: parsed.data.product,
      title: parsed.data.title,
      front: parsed.data.front,
      back: parsed.data.back,
      anonymousToken: userId ? null : (parsed.data.anonymousToken ?? null),
    },
  });

  return NextResponse.json({ id: design.id });
}

export async function GET() {
  const clerkId = await safeClerkUserId();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const designs = await db.cardDesign.findMany({
    where: { userId: user.id },
    select: { id: true, title: true, thumbnailFront: true, thumbnailBack: true, updatedAt: true, createdAt: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ designs });
}
