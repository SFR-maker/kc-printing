import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/prisma";
import { Reveal } from "@/components/motion/Reveal";
import { PortfolioGrid, type PortfolioSample } from "@/components/portfolio/portfolio-grid";

export const metadata: Metadata = {
  title: "Design Portfolio",
  description:
    "Real business card, postcard, banner, and rigid sign designs from 611 Printing's template library, serving Kansas City and nationwide.",
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

type Row = { slug: string; title: string; thumbnailFront: string | null; product: string; industry: string | null };

/** "real-estate" -> "Real Estate" */
function industryLabel(slug: string | null): string | null {
  if (!slug) return null;
  return slug
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Round-robin one template per industry before taking a second from any industry. `sortOrder` alone
 * front-loads whichever industry happens to have the lowest values, which is why the page used to
 * read as an all-real-estate gallery.
 */
function spreadByIndustry(rows: Row[], limit: number): Row[] {
  const byIndustry = new Map<string, Row[]>();
  for (const row of rows) {
    const key = row.industry ?? "other";
    const bucket = byIndustry.get(key);
    if (bucket) bucket.push(row);
    else byIndustry.set(key, [row]);
  }

  const buckets = [...byIndustry.values()];
  const out: Row[] = [];
  for (let pass = 0; out.length < limit; pass += 1) {
    const before = out.length;
    for (const bucket of buckets) {
      if (out.length >= limit) break;
      if (bucket[pass]) out.push(bucket[pass]);
    }
    if (out.length === before) break; // every bucket exhausted
  }
  return out;
}

export default async function PortfolioPage() {
  // One query per product rather than a single flat `take` — Postgres enums sort by declaration
  // order, not alphabetically, and Business Cards alone has far more featured rows than the other
  // three products combined, so a single ordered-and-capped query silently returned zero
  // postcards/banners/rigid signs.
  const perProduct = await Promise.all(
    (["BUSINESS_CARD", "POSTCARD", "BANNER", "RIGID_SIGN"] as const).map(async (product) => {
      const rows = await db.cardTemplate.findMany({
        where: { featured: true, active: true, product },
        orderBy: { sortOrder: "asc" },
        select: { slug: true, title: true, thumbnailFront: true, product: true, industry: true },
        take: 40,
      });
      return spreadByIndustry(rows, 12);
    })
  );

  // Interleave rather than concatenate so the default "All" view alternates products instead of
  // showing 12 business cards in a row before a single postcard appears.
  const maxLen = Math.max(...perProduct.map((p) => p.length));
  const templates = Array.from({ length: maxLen }, (_, i) => perProduct.map((p) => p[i]))
    .flat()
    .filter((t) => t != null);

  const samples: PortfolioSample[] = templates
    .filter((t) => t.thumbnailFront)
    .map((t) => ({
      slug: t.slug,
      // Template titles are stored as "Real Estate: Bottom Band". The industry moves down to the
      // meta line so a grid of same-industry templates doesn't read as the same word 12 times.
      title: t.title.includes(": ") ? t.title.slice(t.title.indexOf(": ") + 2) : t.title,
      thumbnail: t.thumbnailFront!,
      category: CATEGORY_LABEL[t.product] ?? t.product,
      industry: industryLabel(t.industry),
      href: `/services/${ROUTE_SEGMENT[t.product] ?? "business-cards"}/design/t-${t.slug}`,
    }));

  return (
    <>
      <section className="bg-kc-bg">
        <div className="reg-bar" />
        <div className="container-tight px-4 pb-12 pt-16 sm:px-6 lg:px-8 lg:pb-16 lg:pt-24">
          <Reveal className="max-w-2xl">
            <h1 className="display-tight text-[2.75rem] text-kc-dark sm:text-6xl">Design examples</h1>
            <p className="mt-5 text-[17px] leading-relaxed text-kc-dark/65">
              Real designs pulled from our template library. Pick one to customize as your own, or
              we will build something new for your business.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="band-tight bg-kc-paper">
        <div className="container-tight">
          {/* The grid's card titles are h3, and the only other heading on the page sits below it,
              so the outline jumped h1 -> h3. This labels the grid for screen-reader navigation
              without adding a heading the design does not call for. */}
          <h2 className="sr-only">Template library</h2>
          <PortfolioGrid samples={samples} />
        </div>
      </section>

      <section className="bg-kc-bg">
        <div className="container-tight px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="flex flex-col items-start justify-between gap-7 border-t border-kc-dark/12 pt-10 sm:flex-row sm:items-end">
            <div>
              <h2 className="display-tight text-2xl text-kc-dark sm:text-[1.9rem]">
                Want something custom?
              </h2>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-kc-dark/60">
                Ask and we will share examples relevant to your industry, or start from a blank file
                with a designer.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="edge h-12 bg-kc-coral px-7 text-[15px] font-semibold text-white transition-colors hover:bg-kc-magenta-deep"
              >
                <Link href="/contact">Contact us</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="edge h-12 border border-kc-dark/20 bg-transparent px-7 text-[15px] font-semibold text-kc-dark transition-colors hover:border-kc-dark/40 hover:bg-kc-dark/5"
              >
                <Link href="/services/business-cards/design">Start designing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
