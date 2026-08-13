import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/service-data";
import { ProductBuilder } from "@/components/builder/ProductBuilder";
import { ServicePageContent } from "@/components/sections/ServicePageContent";
import { localeAlternates } from "@/lib/i18n/metadata";
import { TEST_ORDER_PARAM, isTestOrderCode } from "@/lib/pricing/test-order";
import { getPricingSettings } from "@/lib/pricing/settings-server";
import { getFeaturedThumbnails } from "@/lib/product-thumbnails";

const service = SERVICES["business-cards"];

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
export default async function BusinessCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ package?: string; designId?: string; test?: string; proof?: string }>;
}) {
  if (!service) notFound();
  const params = await searchParams;
  // Validated during server rendering so TEST_ORDER_CODE never enters the client bundle.
  const testCode = isTestOrderCode(params[TEST_ORDER_PARAM]) ? params[TEST_ORDER_PARAM] : undefined;

  return (
    <>
      <ProductBuilder
        service={service}
        defaultPackage={params.package}
        cardDesignId={params.designId}
        proofApproved={params.proof === "approved"}
        testCode={testCode}
        pricing={await getPricingSettings()}
      />
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
