import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/service-data";
import { ProductBuilder } from "@/components/builder/ProductBuilder";
import { TEST_ORDER_PARAM, isTestOrderCode } from "@/lib/pricing/test-order";
import { getPricingSettings } from "@/lib/pricing/settings-server";

export const metadata: Metadata = {
  title: "Order Business Cards",
  description:
    "Order custom business card design from 611 Printing. Choose a package, share your brand details, and receive print-ready files.",
};
const service = SERVICES["business-cards"];

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ package?: string; designId?: string; test?: string; proof?: string }>;
}) {
  if (!service) notFound();
  const params = await searchParams;
  // Validated here, during server rendering, so TEST_ORDER_CODE never enters the client bundle -
  // only the code the operator already typed into their own address bar is handed back to the
  // builder, and /api/orders checks it again before pricing anything at zero.
  const testCode = isTestOrderCode(params[TEST_ORDER_PARAM]) ? params[TEST_ORDER_PARAM] : undefined;
  return (
    <ProductBuilder
      service={service}
      defaultPackage={params.package}
      cardDesignId={params.designId}
      proofApproved={params.proof === "approved"}
      testCode={testCode}
      pricing={await getPricingSettings()}
    />
  );
}
