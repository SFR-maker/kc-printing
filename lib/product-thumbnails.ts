import { unstable_cache } from "next/cache";
import { db } from "@/lib/prisma";
import { TEMPLATES_TAG } from "@/lib/cache-tags";
import { assetUrl } from "@/lib/asset-url";

export const PRODUCT_BY_SLUG = {
  "business-cards": "BUSINESS_CARD",
  postcards: "POSTCARD",
  banners: "BANNER",
  "rigid-signs": "RIGID_SIGN",
  "window-decals": "WINDOW_DECAL",
} as const;

export interface ProductThumbnail {
  url: string;
  title: string;
  /** Template slug, so a thumbnail can deep-link into the editor pre-loaded with that design. */
  slug: string;
}

/**
 * The rows behind the rail, exactly as stored. Cached across requests.
 *
 * The curation changes when someone reseeds templates or edits `featured` - a handful of times a
 * year, not per visitor. `slug` and `take` are arguments rather than closed over, so they form the
 * cache key and each product gets its own entry.
 *
 * Note what is *not* in here: the CDN origin. This cache is written to .next/cache and survives a
 * restart, so anything env-dependent baked into it outlives the environment that produced it - the
 * paths were cached before NEXT_PUBLIC_ASSET_CDN_BASE was set and kept being replayed afterwards,
 * pointing at files no longer in the deployment. Cache the data; build the URL per render.
 */
const getFeaturedRows = unstable_cache(
  async (slug: keyof typeof PRODUCT_BY_SLUG, take: number) =>
    db.cardTemplate.findMany({
      where: { featured: true, active: true, product: PRODUCT_BY_SLUG[slug] },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, title: true, thumbnailFront: true },
      take,
    }),
  ["featured-thumbnails"],
  { revalidate: 3600, tags: [TEMPLATES_TAG] },
);

/** The three featured designs on each product page's "start from a design" rail. */
export async function getFeaturedThumbnails(
  slug: keyof typeof PRODUCT_BY_SLUG,
  take = 3,
): Promise<ProductThumbnail[]> {
  const templates = await getFeaturedRows(slug, take);
  return templates
    .filter((t) => t.thumbnailFront)
    .map((t) => ({
      // Resolved here, outside the cache, so the origin always matches this deployment.
      url: assetUrl(t.thumbnailFront!),
      // Titles are stored as "Real Estate: Bold Block"; the industry prefix repeats down a rail.
      title: t.title.includes(": ") ? t.title.slice(t.title.indexOf(": ") + 2) : t.title,
      slug: t.slug,
    }));
}
