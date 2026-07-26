import { db } from "@/lib/prisma";

export const PRODUCT_BY_SLUG = {
  "business-cards": "BUSINESS_CARD",
  postcards: "POSTCARD",
  banners: "BANNER",
  "rigid-signs": "RIGID_SIGN",
} as const;

export interface ProductThumbnail {
  url: string;
  title: string;
}

export async function getFeaturedThumbnails(slug: keyof typeof PRODUCT_BY_SLUG, take = 3): Promise<ProductThumbnail[]> {
  const templates = await db.cardTemplate.findMany({
    where: { featured: true, active: true, product: PRODUCT_BY_SLUG[slug] },
    orderBy: { sortOrder: "asc" },
    select: { title: true, thumbnailFront: true },
    take,
  });
  return templates.filter((t) => t.thumbnailFront).map((t) => ({ url: t.thumbnailFront!, title: t.title }));
}
