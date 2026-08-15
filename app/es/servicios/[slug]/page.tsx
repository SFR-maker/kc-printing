import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/service-data";
import { SERVICES_ES } from "@/lib/service-data-es";
import { ProductBuilder } from "@/components/builder/ProductBuilder";
import { ServicePageContent } from "@/components/sections/ServicePageContent";
import { getFeaturedThumbnails, PRODUCT_BY_SLUG } from "@/lib/product-thumbnails";
import { SERVICE_SLUG_ES, serviceSlugFromEs } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/i18n/metadata";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { TEST_ORDER_PARAM, isTestOrderCode } from "@/lib/pricing/test-order";
import { getPricingSettings } from "@/lib/pricing/settings-server";

/**
 * Every Spanish product page, from one route.
 *
 * The English side is five separate files because each wires up its own design-studio link and, in
 * the case of window decals, its own photographed variants. None of that differs by language, so
 * the Spanish side resolves the same configuration from a table keyed by the English slug - which is
 * also what keeps a new product from needing a second file written in Spanish before it appears.
 *
 * Like its English twin, this page *is* the configurator: ProductBuilder on top with the live print
 * price, the Spanish marketing content underneath. It used to be marketing only, which meant the
 * Spanish site could describe a banner but could not tell anyone what one costs or take an order for
 * it - the English page's whole reason for existing, missing from the translation.
 *
 * ProductBuilder is handed the *English* ServiceDef on purpose. Its controls are English (see
 * ORDER_FLOW_LOCALE), so feeding it Spanish package bullets would produce a configurator that is
 * half one language and half the other, and it would put Spanish product names into order rows and
 * AI prompts that every English order writes in English. Only the h1 and the language warning are
 * translated, because those are what the page is read and ranked on.
 */

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

/**
 * The five slugs this route answers on.
 *
 * Kept although reading `searchParams` below opts the page into dynamic rendering, exactly as it
 * does on the English pages: it is what makes an unknown Spanish slug a build-time-known 404 rather
 * than something only a visitor discovers.
 */
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

export default async function SpanishServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ package?: string; designId?: string; test?: string; proof?: string }>;
}) {
  const { slug } = await params;
  const enSlug = serviceSlugFromEs(slug);
  const service = enSlug ? SERVICES_ES[enSlug] : null;
  const enService = enSlug ? SERVICES[enSlug] : null;
  if (!service || !enService || !enSlug) notFound();

  const config = CONFIG[enSlug] ?? { studio: false };
  const query = await searchParams;
  // Validated during server rendering so TEST_ORDER_CODE never enters the client bundle.
  const testCode = isTestOrderCode(query[TEST_ORDER_PARAM]) ? query[TEST_ORDER_PARAM] : undefined;
  const t = getDictionary("es").service;

  const heroImages = enSlug in PRODUCT_BY_SLUG
    ? await getFeaturedThumbnails(enSlug as keyof typeof PRODUCT_BY_SLUG)
    : [];

  return (
    <>
      <ProductBuilder
        service={enService}
        defaultPackage={query.package}
        cardDesignId={query.designId}
        proofApproved={query.proof === "approved"}
        testCode={testCode}
        pricing={await getPricingSettings()}
        heading={`Pedir ${service.name.toLowerCase()}`}
        note={t.orderFlowLanguageNote}
      />
      <ServicePageContent
        service={service}
        // English URL by design: the Design Studio is not translated. See ORDER_FLOW_LOCALE.
        designStudioHref={config.studio ? `/services/${enSlug}/design` : undefined}
        aiDesignHref={config.studio ? `/services/${enSlug}/design?startAi=1` : undefined}
        heroImages={heroImages}
        variants={config.variants}
        locale="es"
        // The configurator above is already the hero, the price and the call to action, exactly as
        // on the English page.
        variant="details-only"
      />
    </>
  );
}
