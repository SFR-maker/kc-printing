import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/service-data";
import { ProductBuilder } from "@/components/builder/ProductBuilder";

export const metadata: Metadata = {
  title: "Order Rigid Signs",
  description:
    "Order custom rigid sign design from KC Printing. Die-cut shapes and materials, delivered print-ready with a die line.",
};
const service = SERVICES["rigid-signs"];

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ package?: string; designId?: string }> }) {
  if (!service) notFound();
  const { package: pkg, designId } = await searchParams;
  return <ProductBuilder service={service} defaultPackage={pkg} cardDesignId={designId} />;
}
