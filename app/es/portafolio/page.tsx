import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/prisma";
import { Reveal } from "@/components/motion/Reveal";
import { PortfolioGrid, type PortfolioSample } from "@/components/portfolio/portfolio-grid";
import { localeAlternates } from "@/lib/i18n/metadata";

export const metadata: Metadata = {
  title: "Ejemplos de diseño",
  description:
    "Diseños reales de tarjetas de presentación, postales, lonas, letreros rígidos y calcomanías para ventanas de la biblioteca de plantillas de 611 Printing.",
  alternates: localeAlternates("/portfolio", "es"),
};

export const revalidate = 3600;

const ROUTE_SEGMENT: Record<string, string> = {
  BUSINESS_CARD: "business-cards",
  POSTCARD: "postcards",
  BANNER: "banners",
  RIGID_SIGN: "rigid-signs",
  WINDOW_DECAL: "window-decals",
};

const CATEGORY_LABEL: Record<string, string> = {
  BUSINESS_CARD: "Tarjetas de presentación",
  POSTCARD: "Postales",
  BANNER: "Lonas publicitarias",
  RIGID_SIGN: "Letreros rígidos",
  WINDOW_DECAL: "Calcomanías para ventanas",
};

/**
 * Industry keys, translated for display.
 *
 * The keys themselves stay English because they are how templates are stored and filtered; only the
 * label a customer reads changes. Anything without a translation falls back to a title-cased version
 * of the key rather than disappearing from the filter.
 */
const INDUSTRY_LABEL: Record<string, string> = {
  "real-estate": "Bienes raíces",
  construction: "Construcción",
  roofing: "Techos",
  plumbing: "Plomería",
  electrical: "Electricidad",
  landscaping: "Jardinería",
  cleaning: "Limpieza",
  automotive: "Automotriz",
  restaurant: "Restaurantes",
  "beauty-salon": "Belleza y salón",
  healthcare: "Salud",
  dental: "Dental",
  legal: "Legal",
  accounting: "Contabilidad",
  insurance: "Seguros",
  technology: "Tecnología",
  "creative-agency": "Agencia creativa",
  photography: "Fotografía",
  consulting: "Consultoría",
  "general-corporate": "Corporativo",
};

type Row = { slug: string; title: string; thumbnailFront: string | null; product: string; industry: string | null };

function industryLabel(slug: string | null): string | null {
  if (!slug) return null;
  return INDUSTRY_LABEL[slug]
    ?? slug.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Round-robin one template per industry, so the grid does not read as one industry repeated. */
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
    if (out.length === before) break;
  }
  return out;
}

export default async function SpanishPortfolioPage() {
  const perProduct = await Promise.all(
    (["BUSINESS_CARD", "POSTCARD", "BANNER", "RIGID_SIGN", "WINDOW_DECAL"] as const).map(async (product) => {
      const rows = await db.cardTemplate.findMany({
        where: { featured: true, active: true, product },
        orderBy: { sortOrder: "asc" },
        select: { slug: true, title: true, thumbnailFront: true, product: true, industry: true },
        take: 40,
      });
      return spreadByIndustry(rows, 12);
    }),
  );

  const maxLen = Math.max(...perProduct.map((p) => p.length));
  const templates = Array.from({ length: maxLen }, (_, i) => perProduct.map((p) => p[i]))
    .flat()
    .filter((t) => t != null);

  const samples: PortfolioSample[] = templates
    .filter((t) => t.thumbnailFront)
    .map((t) => ({
      slug: t.slug,
      title: t.title.includes(": ") ? t.title.slice(t.title.indexOf(": ") + 2) : t.title,
      thumbnail: t.thumbnailFront!,
      category: CATEGORY_LABEL[t.product] ?? t.product,
      industry: industryLabel(t.industry),
      // The editor is English-only, so these deep-link to the English studio route.
      href: `/services/${ROUTE_SEGMENT[t.product] ?? "business-cards"}/design/t-${t.slug}`,
    }));

  return (
    <>
      <section className="bg-kc-bg">
        <div className="reg-bar" />
        <div className="container-tight px-4 pb-12 pt-16 sm:px-6 lg:px-8 lg:pb-16 lg:pt-24">
          <Reveal className="max-w-2xl">
            <h1 className="display-tight text-[2.94rem] text-kc-dark sm:text-6xl">Ejemplos de diseño</h1>
            <p className="mt-5 text-[18.19px] leading-relaxed text-kc-dark/75">
              Diseños reales de nuestra biblioteca de plantillas. Elija uno para personalizarlo como
              suyo, o le armamos algo nuevo para su negocio. El editor está en inglés.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="band-tight bg-kc-paper">
        <div className="container-tight">
          <h2 className="sr-only">Biblioteca de plantillas</h2>
          <PortfolioGrid samples={samples} />
        </div>
      </section>

      <section className="bg-kc-bg">
        <div className="container-tight px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="flex flex-col items-start justify-between gap-7 border-t border-kc-dark/12 pt-10 sm:flex-row sm:items-end">
            <div>
              <h2 className="display-tight text-2xl text-kc-dark sm:text-[2.03rem]">
                ¿Quiere algo a la medida?
              </h2>
              <p className="mt-3 max-w-md text-[16.05px] leading-relaxed text-kc-dark/70">
                Pídanoslo y le compartimos ejemplos de su giro, o empezamos desde cero con su marca.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="edge h-12 shrink-0 bg-kc-coral px-7 text-[16.05px] font-semibold text-white transition-colors hover:bg-kc-magenta-deep"
            >
              <Link href="/es/contacto">Contáctenos</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
