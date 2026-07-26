import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/prisma";
import { PortfolioGrid, type PortfolioSample } from "@/components/portfolio/portfolio-grid";

export const metadata: Metadata = {
  title: "Design Portfolio",
  description:
    "Real business card, postcard, banner, and rigid sign designs from KC Printing's template library, serving Kansas City and nationwide.",
};

const ROUTE_SEGMENT: Record<string, string> = {
  BUSINESS_CARD: "business-cards",
  POSTCARD: "postcards",
  BANNER: "banners",
  RIGID_SIGN: "rigid-signs",
};

const CATEGORY_LABEL: Record<string, string> = {
  BUSINESS_CARD: "Business Cards",
  POSTCARD: "Postcards",
  BANNER: "Banners",
  RIGID_SIGN: "Rigid Signs",
};

export const revalidate = 3600;

export default async function PortfolioPage() {
  // One query per product rather than a single flat `take` — Postgres enums sort by declaration
  // order, not alphabetically, and Business Cards alone has far more featured rows than the other
  // three products combined, so a single ordered-and-capped query silently returned zero
  // postcards/banners/rigid signs.
  const perProduct = await Promise.all(
    (["BUSINESS_CARD", "POSTCARD", "BANNER", "RIGID_SIGN"] as const).map((product) =>
      db.cardTemplate.findMany({
        where: { featured: true, active: true, product },
        orderBy: { sortOrder: "asc" },
        select: { slug: true, title: true, thumbnailFront: true, product: true, industry: true },
        take: 10,
      })
    )
  );
  // Interleave rather than concatenate so the default "All" view alternates products instead of
  // showing 10 business cards in a row before a single postcard appears.
  const maxLen = Math.max(...perProduct.map((p) => p.length));
  const templates = Array.from({ length: maxLen }, (_, i) => perProduct.map((p) => p[i])).flat().filter((t) => t != null);

  const samples: PortfolioSample[] = templates
    .filter((t) => t.thumbnailFront)
    .map((t) => ({
      slug: t.slug,
      title: t.title,
      thumbnail: t.thumbnailFront!,
      category: CATEGORY_LABEL[t.product] ?? t.product,
      href: `/services/${ROUTE_SEGMENT[t.product] ?? "business-cards"}/design/t-${t.slug}`,
    }));

  return (
    <div>
      <div className="section-pad-tight bg-kc-bg">
        <div className="container-tight max-w-2xl">
          <h1 className="mb-3 text-4xl font-black tracking-tight text-kc-dark sm:text-5xl">Design examples</h1>
          <p className="text-lg text-kc-muted">
            Real designs pulled from our template library. Pick one to customize as your own, or we will build something new for your business.
          </p>
        </div>
      </div>

      <div className="container-tight px-4 py-12 sm:px-6 lg:px-8">
        <PortfolioGrid samples={samples} />

        <div className="mt-14 flex flex-col items-start justify-between gap-6 rounded-md border border-kc-border bg-kc-violet-tint p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="mb-1.5 text-xl font-bold text-kc-dark">Want to see more, or something custom?</h2>
            <p className="text-sm text-kc-muted">Ask and we will share examples relevant to your industry.</p>
          </div>
          <Button asChild className="shrink-0 rounded-md bg-kc-coral text-white hover:bg-kc-coral/90">
            <Link href="/contact">Request Samples <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
