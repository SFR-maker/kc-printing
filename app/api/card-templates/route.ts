import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

/**
 * The template list for one product.
 *
 * This route used to accept `industry`, `style` and `q` as well, building an OR of roughly
 * seventeen unindexed `contains` predicates for a three-word query. Nothing ever sent them: the
 * gallery and the editor's template switcher both request only `product` (and the gallery,
 * `orientation`), and every filter a customer actually operates runs client-side over the loaded
 * set. So the expensive half of this query was dead weight that would have become a sequential
 * scan over a much larger table as the library grows - the kind of thing that is free until it
 * suddenly is not. Filtering was removed rather than indexed, deliberately: if server-side search
 * ever comes back it should arrive with a GIN index on `tags` and pg_trgm for the ILIKEs, as a
 * decision rather than an inheritance.
 *
 * `orientation` stays a server filter because it is cheap and indexed-adjacent, but the response is
 * cached per product, so the gallery now asks for the whole product set once and narrows in memory
 * - see the comment in template-gallery.
 */
const PRODUCT_MAP: Record<string, "BUSINESS_CARD" | "POSTCARD" | "BANNER" | "RIGID_SIGN" | "WINDOW_DECAL"> = {
  "business-card": "BUSINESS_CARD",
  postcard: "POSTCARD",
  banner: "BANNER",
  "rigid-sign": "RIGID_SIGN",
  "window-decal": "WINDOW_DECAL",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orientation = searchParams.get("orientation");
  const product = PRODUCT_MAP[searchParams.get("product") ?? "business-card"] ?? "BUSINESS_CARD";

  const templates = await db.cardTemplate.findMany({
    where: {
      active: true,
      product,
      ...(orientation ? { orientation } : {}),
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

  /*
   * Cacheable at the edge, because the response is the same for everybody.
   *
   * Nothing here is personalised and nothing depends on a session, so a CDN can answer this without
   * waking a function or touching Railway. The key space is small - five products, plus the two
   * orientation variants banners use - and Vercel's route-handler cache is deployment-scoped, so a
   * reseed followed by a redeploy invalidates it naturally rather than needing a purge.
   *
   * stale-while-revalidate is generous on purpose: a template library that is one revision out of
   * date for a few seconds is not a problem worth a cold database read per gallery visit.
   */
  return NextResponse.json(
    { templates, count: templates.length },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400" } },
  );
}
