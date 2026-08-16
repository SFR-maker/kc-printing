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
 * The three featured designs on each product page's "start from a design" rail.
 *
 * Cached across requests: the curation behind it changes when someone reseeds templates or edits
 * `featured`, which is a handful of times a year, not per visitor. `slug` and `take` are arguments
 * rather than closed over, so they form the cache key and each product gets its own entry.
 */
export const getFeaturedThumbnails = unstable_cache(
  getFeaturedThumbnailsUncached,
  ["featured-thumbnails"],
  { revalidate: 3600, tags: [TEMPLATES_TAG] },
);

async function getFeaturedThumbnailsUncached(slug: keyof typeof PRODUCT_BY_SLUG, take = 3): Promise<ProductThumbnail[]> {
  const templates = await db.cardTemplate.findMany({
    where: { featured: true, active: true, product: PRODUCT_BY_SLUG[slug] },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, title: true, thumbnailFront: true },
    take,
  });
  return templates
    .filter((t) => t.thumbnailFront)
    .map((t) => ({
      url: assetUrl(t.thumbnailFront!),
      // Titles are stored as "Real Estate: Bold Block"; the industry prefix repeats down a rail.
      title: t.title.includes(": ") ? t.title.slice(t.title.indexOf(": ") + 2) : t.title,
      slug: t.slug,
    }));
}
