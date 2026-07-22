import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const industry = searchParams.get("industry");
  const style = searchParams.get("style");
  const orientation = searchParams.get("orientation");
  const q = searchParams.get("q");

  const templates = await db.cardTemplate.findMany({
    where: {
      active: true,
      ...(industry && industry !== "all" ? { industry } : {}),
      ...(style && style !== "all" ? { style } : {}),
      ...(orientation ? { orientation } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { tags: { has: q.toLowerCase() } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      industry: true,
      style: true,
      tags: true,
      orientation: true,
      palette: true,
      thumbnailFront: true,
      thumbnailBack: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ templates, count: templates.length });
}
