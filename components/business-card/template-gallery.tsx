"use client";

import { useEffect, useMemo, useState } from "react";
import { categoriesForQuery, matchesQuery } from "@/lib/business-card/templates/occupations";
import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { STYLE_TAGS } from "@/lib/business-card/templates/categories";
import { PRODUCT_ROUTE_SEGMENT, type DesignProduct } from "@/lib/business-card/print-spec";
import { CreateWithAiDialog } from "@/components/business-card/create-with-ai-dialog";
import { titleCaseSlug } from "@/lib/utils";
import { assetUrl } from "@/lib/asset-url";

interface TemplateSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  industry: string;
  style: string;
  tags: string[];
  palette: string[];
  /** "landscape" | "portrait" on banners; null on products where it does not apply. */
  orientation: string | null;
}

function recentKeyFor(product: DesignProduct): string {
  return `kc-recent-templates-${product}`;
}

function getRecent(product: DesignProduct): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(recentKeyFor(product)) ?? "[]");
  } catch {
    return [];
  }
}

const THUMB_ASPECT: Record<DesignProduct, string> = {
  "business-card": "aspect-[7/4.2]",
  postcard: "aspect-[3/2]",
  banner: "aspect-[4/3]",
  "rigid-sign": "aspect-square",
  // Window graphics are predominantly wide storefront banners, so the gallery tile matches the
  // proportion most of the templates are actually drawn at rather than squaring them off.
  "window-decal": "aspect-[3/2]",
};

export function TemplateGallery({
  product = "business-card",
  orientation,
}: {
  product?: DesignProduct;
  /**
   * Narrows the gallery to templates that hang the way the customer has chosen.
   *
   * Stored on the template as "landscape" / "portrait"; the banner order flow speaks in
   * "horizontal" / "vertical". Mapped at the call site so the gallery keeps the database's
   * vocabulary and the order flow keeps the customer's.
   */
  orientation?: "landscape" | "portrait";
}) {
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [industry, setIndustry] = useState("all");
  const [style, setStyle] = useState("all");
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const routeSegment = PRODUCT_ROUTE_SEGMENT[product];
  const thumbAspect = THUMB_ASPECT[product];
  const supportsAi = product !== "rigid-sign";

  useEffect(() => {
    // localStorage isn't available during SSR, so this can only be read post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecent(getRecent(product));
  }, [product]);

  useEffect(() => {
    let cancelled = false;

    /*
     * One request for the whole product, always. Orientation is narrowed in memory below.
     *
     * This used to fetch the orientation-filtered set and then, when that came back empty, fetch
     * the unfiltered set as well - so the case that needed the *most* help paid for two round
     * trips. Every banner template is currently landscape, which is exactly the case that
     * triggered it, so asking for vertical banners was reliably the slowest thing the gallery did.
     *
     * Fetching unfiltered instead means one request, and one cache key per product rather than
     * three, which matters now the response carries s-maxage: the orientation variants would each
     * have been a separate entry to fill and re-fill.
     */
    async function load() {
      try {
        const res = await fetch(`/api/card-templates?product=${product}`);
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        if (cancelled) return;
        setTemplates(data.templates ?? []);
      } catch {
        if (!cancelled) setError(true);
      }
    }
    void load();

    return () => {
      cancelled = true;
    };
    // Only `product` now: orientation no longer changes what is fetched, only what is displayed.
  }, [product]);

  /*
   * Narrow to the requested orientation, or fall back to everything and say so.
   *
   * The fallback is the point, not an edge case: every banner template is currently landscape, so
   * a customer configuring a vertical banner would otherwise be shown an empty gallery and conclude
   * the site is broken rather than that the library is thin. Showing all of them with a note is
   * honest and still useful, and the note disappears on its own once portrait designs exist.
   *
   * Derived rather than stored, now that the fetch no longer varies by orientation - state here
   * would just be a second copy of something the loaded list already answers.
   */
  const { forOrientation, orientationUnavailable } = useMemo(() => {
    const all = templates ?? [];
    if (!orientation) return { forOrientation: all, orientationUnavailable: false };
    const matching = all.filter((t) => t.orientation === orientation);
    if (matching.length > 0) return { forOrientation: matching, orientationUnavailable: false };
    return { forOrientation: all, orientationUnavailable: all.length > 0 };
  }, [templates, orientation]);

  const filtered = useMemo(() => {
    if (!templates) return [];
    return forOrientation.filter((t) => {
      if (industry !== "all" && t.industry !== industry) return false;
      if (style !== "all" && t.style !== style) return false;
      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        /*
         * Match the job as well as the words on the card.
         *
         * Categories are the shop's filing system, not the words customers use: "plumber" did not
         * match the `plumbing` category and "hairdresser" matched nothing at all, so the gallery
         * looked empty for trades that had dozens of cards. categoriesForQuery expands the query
         * into the categories an occupation belongs to.
         */
        const viaOccupation = new Set(categoriesForQuery(needle));
        const hit =
          matchesQuery(t.title, needle) ||
          matchesQuery(t.description, needle) ||
          t.tags.some((tag) => matchesQuery(tag, needle)) ||
          matchesQuery(t.industry, needle) ||
          viaOccupation.has(t.industry);
        if (!hit) return false;
      }
      return true;
    });
  }, [templates, forOrientation, industry, style, q]);

  // Derived from the loaded set rather than a fixed list, so the filter only ever offers industries
  // that have templates for this product. Hidden entirely below two, where it would be noise.
  const industries = useMemo(
    () => [...new Set(forOrientation.map((t) => t.industry).filter(Boolean))].sort(),
    [forOrientation]
  );

  const recentTemplates = forOrientation.filter((t) => recent.includes(t.slug));

  if (error) {
    return (
      <div className="rounded-xl border border-dashed border-red-200 bg-red-50 py-16 text-center text-sm text-red-700">
        Couldn&apos;t load templates right now. <button onClick={() => window.location.reload()} className="font-semibold underline">Try again</button>, or{" "}
        <Link href={`/services/${routeSegment}/design/new`} className="font-semibold underline">start from a blank design</Link>.
      </div>
    );
  }

  if (!templates) return <GallerySkeleton aspect={thumbAspect} />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kc-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates..." className="pl-9" />
        </div>
        {industries.length > 1 && (
          <select
            aria-label="Filter by industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="rounded-md border border-kc-border bg-white px-3 py-2 text-sm"
          >
            <option value="all">All Industries</option>
            {industries.map((i) => <option key={i} value={i}>{titleCaseSlug(i)}</option>)}
          </select>
        )}
        <select
          aria-label="Filter by style"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          className="rounded-md border border-kc-border bg-white px-3 py-2 text-sm"
        >
          <option value="all">All Styles</option>
          {STYLE_TAGS.map((s) => <option key={s} value={s}>{titleCaseSlug(s)}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href={`/services/${routeSegment}/design/new`}
          className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-kc-teal/40 bg-kc-teal/5 px-6 py-5 text-sm font-semibold text-kc-teal transition-colors hover:bg-kc-teal/10 ${supportsAi ? "" : "sm:col-span-2"}`}
        >
          <Sparkles className="h-4 w-4" /> Start From a Blank Design
        </Link>
        {/* AI generation only supports business cards, postcards, and banners today — see the
            product enum in app/api/ai-design/route.ts. */}
        {supportsAi && <CreateWithAiDialog product={product} />}
      </div>

      {recentTemplates.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-kc-dark">Recently Used</h2>
          <TemplateGrid templates={recentTemplates} product={product} routeSegment={routeSegment} thumbAspect={thumbAspect} />
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-kc-dark">{filtered.length} Template{filtered.length !== 1 ? "s" : ""}</h2>
        </div>
        {orientationUnavailable && (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13.5px] leading-snug text-amber-900">
            We don&apos;t have {orientation === "portrait" ? "vertical" : "horizontal"} templates yet, so
            these are all of them. Any of them can be re-laid-out to your size in the editor.
          </p>
        )}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-kc-border py-16 text-center text-sm text-kc-muted">
            No templates match your filters. Try a different search or category.
          </div>
        ) : (
          <TemplateGrid templates={filtered} product={product} routeSegment={routeSegment} thumbAspect={thumbAspect} />
        )}
      </section>
    </div>
  );
}

function TemplateGrid({ templates, product, routeSegment, thumbAspect }: { templates: TemplateSummary[]; product: DesignProduct; routeSegment: string; thumbAspect: string }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {templates.map((t) => (
        <Link
          key={t.slug}
          href={`/services/${routeSegment}/design/t-${t.slug}`}
          onClick={() => {
            const current = getRecent(product).filter((s) => s !== t.slug);
            window.localStorage.setItem(recentKeyFor(product), JSON.stringify([t.slug, ...current].slice(0, 8)));
          }}
          className="group overflow-hidden rounded-xl border border-kc-border bg-white transition-shadow hover:shadow-lg"
        >
          <div className={`${thumbAspect} bg-kc-bg`}>
            {/*
              A URL rather than an inlined data URI, so loading="lazy" genuinely defers the ones
              below the fold and the browser caches them between visits. decoding="async" keeps
              a long grid from blocking paint while it decodes.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              /*
              Straight at the file, not through the API route.
              The route existed to decode a base64 column; the images are files now and the filename
              is the slug for every row, so the route was doing a 45ms remote database query to
              learn a name it already had. A gallery of 947 cards meant up to 947 such queries.
              Measured 50.2ms through the route against 1.56ms for the static file.
            */
            src={assetUrl(`/images/thumbs/${encodeURIComponent(t.slug)}.webp`)}
              alt={t.title}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="p-3">
            <h3 className="truncate text-sm font-semibold text-kc-dark group-hover:text-kc-teal">{t.title}</h3>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Badge variant="secondary" className="border-0 bg-kc-bg text-[10.7px] text-kc-muted">{t.style}</Badge>
              <div className="flex gap-1">
                {t.palette.slice(0, 3).map((c, i) => (
                  <span key={i} className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function GallerySkeleton({ aspect }: { aspect: string }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={`${aspect} animate-pulse rounded-xl bg-kc-bg`} />
      ))}
    </div>
  );
}
