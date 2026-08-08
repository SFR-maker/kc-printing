import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/service-data";
import { ProductBuilder } from "@/components/builder/ProductBuilder";
import { getPricingSettings } from "@/lib/pricing/settings-server";

export const metadata: Metadata = {
  title: "Order Window Decals",
  description:
    "Order custom window decals, clings, and perforated film from 611 Printing. Eleven cut shapes, 117 sizes, delivered print-ready with a cut line.",
};
const service = SERVICES["window-decals"];

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ package?: string; designId?: string }> }) {
  if (!service) notFound();
  const { package: pkg, designId } = await searchParams;
  return <ProductBuilder service={service} defaultPackage={pkg} cardDesignId={designId} pricing={await getPricingSettings()} />;
}
