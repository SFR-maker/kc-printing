import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

const PRODUCT_MAP: Record<string, "BUSINESS_CARD" | "POSTCARD" | "BANNER" | "RIGID_SIGN"> = {
  "business-card": "BUSINESS_CARD",
  postcard: "POSTCARD",
  banner: "BANNER",
  "rigid-sign": "RIGID_SIGN",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const industry = searchParams.get("industry");
  const style = searchParams.get("style");
  const orientation = searchParams.get("orientation");
  const q = searchParams.get("q");
  const product = PRODUCT_MAP[searchParams.get("product") ?? "business-card"] ?? "BUSINESS_CARD";

  const templates = await db.cardTemplate.findMany({
    where: {
      active: true,
      product,
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
    // Curated best-first: hand-picked featured templates (ranked by sortOrder) lead, then
    // everything else falls back to the original insertion order. See CardTemplate.featured.
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ templates, count: templates.length });
}
