import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/service-data";
import { ProductBuilder } from "@/components/builder/ProductBuilder";
import { ServicePageContent } from "@/components/sections/ServicePageContent";
import { getFeaturedThumbnails } from "@/lib/product-thumbnails";
import { localeAlternates } from "@/lib/i18n/metadata";
import { TEST_ORDER_PARAM, isTestOrderCode } from "@/lib/pricing/test-order";
import { getPricingSettings } from "@/lib/pricing/settings-server";

const service = SERVICES["rigid-signs"];

export const metadata: Metadata = {
  alternates: localeAlternates("/services/rigid-signs", "en"),
  title: service?.name ?? "Service",
  description: service?.description ?? "",
};

/**
 * The product page and the order page are one page, as they already are for business cards.
 *
 * Clicking this product from the nav used to land on a brochure with the configurator another click
 * away at /services/rigid-signs/order, while business cards opened straight into a working
 * configurator with a price. One nav click gave two different kinds of page depending on which
 * product you picked, so anyone who learned the site on cards arrived here and found no controls at
 * all.
 *
 * The marketing content stays underneath rather than being deleted: it carries the FAQ, the spec
 * table and the structured data the page ranks on.
 */
export default async function RigidSignsPage({
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
        designStudioHref="/services/rigid-signs/design"
        aiDesignHref="/services/rigid-signs/design?startAi=1"
        // These tiles and the studio link are the page's only real anchors into the editor; the
        // configurator's artwork cards navigate with script.
        heroImages={await getFeaturedThumbnails("rigid-signs")}
        // The configurator above is already the hero, the pricing and the call to action.
        variant="details-only"
      />
    </>
  );
}
