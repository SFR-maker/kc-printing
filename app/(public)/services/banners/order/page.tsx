import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/service-data";
import { ProductBuilder } from "@/components/builder/ProductBuilder";
import { getPricingSettings } from "@/lib/pricing/settings-server";

export const metadata: Metadata = {
  title: "Order Banners",
  description:
    "Order custom banner design from KC Printing. Roll-up stands and large-format vinyl, delivered print-ready.",
};
const service = SERVICES["banners"];

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ package?: string; designId?: string }> }) {
  if (!service) notFound();
  const { package: pkg, designId } = await searchParams;
  return <ProductBuilder service={service} defaultPackage={pkg} cardDesignId={designId} pricing={await getPricingSettings()} />;
}
