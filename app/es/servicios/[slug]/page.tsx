import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SERVICES_ES } from "@/lib/service-data-es";
import { ServicePageContent } from "@/components/sections/ServicePageContent";
import { getFeaturedThumbnails, PRODUCT_BY_SLUG } from "@/lib/product-thumbnails";
import { SERVICE_SLUG_ES, serviceSlugFromEs } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/i18n/metadata";

/**
 * Every Spanish product page, from one route.
 *
 * The English side is five separate files because each wires up its own design-studio link and, in
 * the case of window decals, its own photographed variants. None of that differs by language, so
 * the Spanish side resolves the same configuration from a table keyed by the English slug - which is
 * also what keeps a new product from needing a second file written in Spanish before it appears.
 */

export const revalidate = 3600;

/**
 * Products with a Design Studio, and the film comparison band window decals carry.
 *
 * The studio itself is English-only, so its URL is the English one; the button that leads there is
 * labelled in Spanish and the hero carries the note explaining what language the editor is in.
 */
const CONFIG: Record<string, { studio: boolean; variants?: { name: string; src: string; alt: string; description: string }[] }> = {
  "business-cards": { studio: true },
  postcards: { studio: true },
  banners: { studio: true },
  "rigid-signs": { studio: true },
  "window-decals": {
    studio: true,
    variants: [
      {
        name: "Calcomanía (vinil adhesivo)",
        src: "/images/print/window-decals.webp",
        alt: "Una calcomanía de vinil rectangular aplicada al vidrio de un local, vista desde la banqueta",
        description: "Vinil adhesivo. Se pega a cualquier superficie lisa y limpia, por dentro o por fuera, y dura de tres a cinco años en exteriores.",
      },
      {
        name: "Adhesivo estático",
        src: "/images/print/window-decals-cling.webp",
        alt: "Unas manos alisando un adhesivo estático sobre el interior del vidrio con una espátula de fieltro",
        description: "Sin pegamento: la estática lo sostiene, así que se reposiciona libremente y es el indicado para una promoción que cambia cada mes.",
      },
      {
        name: "Película perforada",
        src: "/images/print/window-decals-perf.webp",
        alt: "Película perforada vista desde el interior de una cafetería, con su patrón de puntos visible contra la calle",
        description: "Se ve como un gráfico sólido desde la calle mientras su personal y sus clientes siguen viendo hacia afuera.",
      },
    ],
  },
};

/** Pre-rendered, since the set of products is fixed and known at build time. */
export function generateStaticParams() {
  return Object.values(SERVICE_SLUG_ES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const enSlug = serviceSlugFromEs(slug);
  const service = enSlug ? SERVICES_ES[enSlug] : null;
  if (!service) return {};

  return {
    title: service.name,
    description: service.description,
    alternates: localeAlternates(`/services/${enSlug}`, "es"),
  };
}

export default async function SpanishServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const enSlug = serviceSlugFromEs(slug);
  const service = enSlug ? SERVICES_ES[enSlug] : null;
  if (!service || !enSlug) notFound();

  const config = CONFIG[enSlug] ?? { studio: false };
  const heroImages = enSlug in PRODUCT_BY_SLUG
    ? await getFeaturedThumbnails(enSlug as keyof typeof PRODUCT_BY_SLUG)
    : [];

  return (
    <ServicePageContent
      service={service}
      // English URL by design: the Design Studio is not translated. See ORDER_FLOW_LOCALE.
      designStudioHref={config.studio ? `/services/${enSlug}/design` : undefined}
      heroImages={heroImages}
      variants={config.variants}
      locale="es"
    />
  );
}
