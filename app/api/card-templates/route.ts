import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { categoriesForQuery, queryTokens } from "@/lib/business-card/templates/occupations";

const PRODUCT_MAP: Record<string, "BUSINESS_CARD" | "POSTCARD" | "BANNER" | "RIGID_SIGN" | "WINDOW_DECAL"> = {
  "business-card": "BUSINESS_CARD",
  postcard: "POSTCARD",
  banner: "BANNER",
  "rigid-sign": "RIGID_SIGN",
  "window-decal": "WINDOW_DECAL",
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
      // Occupation terms are expanded to categories here as well as on the client, so a
      // server-filtered fetch and the in-page filter cannot disagree about what "plumber" means.
      /*
       * Whole phrase first, then each word.
       *
       * Matching only the whole string meant "spring sale" found nothing while "sale" found 26, and
       * "flower shop" missed every florist card. Those are the phrasings customers reach for first,
       * so a phrase has to behave like a search rather than an exact lookup. Mirrors matchesQuery on
       * the client so a server-filtered fetch and the in-page filter agree.
       */
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { industry: { contains: q, mode: "insensitive" } },
              { tags: { has: q.toLowerCase() } },
              ...queryTokens(q).flatMap((t) => [
                { title: { contains: t, mode: "insensitive" as const } },
                { description: { contains: t, mode: "insensitive" as const } },
                { industry: { contains: t, mode: "insensitive" as const } },
                { tags: { has: t } },
              ]),
              ...(categoriesForQuery(q).length ? [{ industry: { in: categoriesForQuery(q) } }] : []),
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
      /*
       * Thumbnails are deliberately not selected.
       *
       * They were once stored as base64 data URIs, and returning them inlined made this response
       * 3.3 MB for business cards - 0.9 MB of which was the back thumbnail the gallery never
       * renders. They are files now, and the gallery builds the URL from the slug itself
       * (components/business-card/template-gallery.tsx), so it never needs the column at all.
       */
      // Whether there is an image to point at, without carrying the image.
      thumbnailFront: false,
      thumbnailBack: false,
    },
    // Curated best-first: hand-picked featured templates (ranked by sortOrder) lead, then
    // everything else falls back to the original insertion order. See CardTemplate.featured.
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ templates, count: templates.length });
}
