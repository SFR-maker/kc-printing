import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/service-data";
import { ProductBuilder } from "@/components/builder/ProductBuilder";
import { ConfiguratorSkeleton } from "@/components/builder/ConfiguratorSkeleton";
import { ServicePageContent } from "@/components/sections/ServicePageContent";
import { getFeaturedThumbnails } from "@/lib/product-thumbnails";
import { localeAlternates } from "@/lib/i18n/metadata";
import { getPricingSettings } from "@/lib/pricing/settings-server";

const service = SERVICES["banners"];

/*
 * Prerendered and revalidated, not rendered per request.
 *
 * The page took its shape from searchParams, which forced a function invocation for every view of
 * the busiest pages on the site. ProductBuilder reads those in the browser now. Pricing comes from
 * a tagged cache that /admin/pricing invalidates, so an owner's edit still appears at once.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: localeAlternates("/services/banners", "en"),
  title: service?.name ?? "Service",
  description: service?.description ?? "",
};

/**
 * The product page and the order page are one page, as they already are for business cards.
 *
 * Clicking this product from the nav used to land on a brochure with the configurator another click
 * away at /services/banners/order, while business cards opened straight into a working
 * configurator with a price. One nav click gave two different kinds of page depending on which
 * product you picked, so anyone who learned the site on cards arrived here and found no controls at
 * all.
 *
 * The marketing content stays underneath rather than being deleted: it carries the FAQ, the spec
 * table and the structured data the page ranks on.
 */
export default async function BannersPage() {
  if (!service) notFound();

return (
    <>
      <Suspense fallback={<ConfiguratorSkeleton />}>
        <ProductBuilder service={service} pricing={await getPricingSettings()} />
      </Suspense>
      <ServicePageContent
        service={service}
        designStudioHref="/services/banners/design"
        aiDesignHref="/services/banners/design?startAi=1"
        // These tiles and the studio link are the page's only real anchors into the editor; the
        // configurator's artwork cards navigate with script.
        heroImages={await getFeaturedThumbnails("banners")}
        // The configurator above is already the hero, the pricing and the call to action.
        variant="details-only"
      />
    </>
  );
}
