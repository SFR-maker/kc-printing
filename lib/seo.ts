import type { Metadata } from "next";
import { db } from "@/lib/prisma";

const DEFAULTS = {
  title: "KC Printing - Professional Print and Design Services in Kansas City",
  description: "Kansas City's premier print and design studio. Business cards, postcards, logo design, banners, websites and more. Fast turnaround, quality results.",
  ogImage: "/og-default.png",
};

export async function generatePageMetadata(path: string): Promise<Metadata> {
  try {
    const seo = await db.pageSeo.findUnique({ where: { path } });
    if (!seo) return { title: DEFAULTS.title, description: DEFAULTS.description };

    return {
      title: seo.title ?? DEFAULTS.title,
      description: seo.description ?? DEFAULTS.description,
      openGraph: {
        title: seo.ogTitle ?? seo.title ?? DEFAULTS.title,
        description: seo.ogDescription ?? seo.description ?? DEFAULTS.description,
        images: seo.ogImage ? [{ url: seo.ogImage }] : [{ url: DEFAULTS.ogImage }],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: seo.ogTitle ?? seo.title ?? DEFAULTS.title,
        description: seo.ogDescription ?? seo.description ?? DEFAULTS.description,
        images: seo.ogImage ? [seo.ogImage] : [DEFAULTS.ogImage],
      },
    };
  } catch {
    return { title: DEFAULTS.title, description: DEFAULTS.description };
  }
}
