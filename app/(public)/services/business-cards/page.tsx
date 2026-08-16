import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/service-data";
import { ProductBuilder } from "@/components/builder/ProductBuilder";
import { ConfiguratorSkeleton } from "@/components/builder/ConfiguratorSkeleton";
import { ServicePageContent } from "@/components/sections/ServicePageContent";
import { localeAlternates } from "@/lib/i18n/metadata";
import { getPricingSettings } from "@/lib/pricing/settings-server";
import { getFeaturedThumbnails } from "@/lib/product-thumbnails";

const service = SERVICES["business-cards"];

/*
 * Prerendered and revalidated, not rendered per request.
 *
 * The page took its shape from searchParams, which forced a function invocation for every view of
 * the busiest pages on the site. ProductBuilder reads those in the browser now. Pricing comes from
 * a tagged cache that /admin/pricing invalidates, so an owner's edit still appears at once.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: localeAlternates("/services/business-cards", "en"),
  title: service?.name ?? "Service",
  description: service?.description ?? "",
};

/**
 * Business cards: the product page and the order page are now one page.
 *
 * Clicking "Business Cards" used to land on a brochure - hero, spec table, three package tiers, an
 * FAQ - with the actual configurator another click away behind an "Order" button. Customers had to
 * mentally join a spec table, a template gallery and a price list that were three separate sections
 * of the page, then start again on a different URL.
 *
 * The configurator now opens the page: the card on the left at a size worth looking at, every
 * choice and the running price on the right. The marketing content stays underneath rather than
 * being deleted - it carries the FAQ, the spec table and the structured data the page ranks on, and
 * it is a reasonable thing to scroll to once the configurator has been seen.
 */
export default async function BusinessCardsPage() {
  if (!service) notFound();

return (
    <>
      <Suspense fallback={<ConfiguratorSkeleton />}>
        <ProductBuilder service={service} pricing={await getPricingSettings()} />
      </Suspense>
      <ServicePageContent
        service={service}
        designStudioHref="/services/business-cards/design"
        aiDesignHref="/services/business-cards/design?startAi=1"
        // Kept, and not just for the gallery: these are the page's only real <a> links into the
        // design studio. The configurator's artwork cards navigate with script, which cannot be
        // opened in a new tab, followed by a crawler, or reached the way a link is.
        heroImages={await getFeaturedThumbnails("business-cards")}
        // The configurator above already is the hero, the pricing and the call to action. Repeating
        // them here would have the page ask for the same decision twice with different controls.
        variant="details-only"
      />
    </>
  );
}
