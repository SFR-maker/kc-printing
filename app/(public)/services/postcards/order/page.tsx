import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/service-data";
import { ProductBuilder } from "@/components/builder/ProductBuilder";

export const metadata: Metadata = {
  title: "Order Postcards",
  description:
    "Order custom postcard design from KC Printing. Choose a package, share your brand details, and receive print-ready files.",
};
const service = SERVICES["postcards"];

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ package?: string; designId?: string }> }) {
  if (!service) notFound();
  const { package: pkg, designId } = await searchParams;
  return <ProductBuilder service={service} defaultPackage={pkg} cardDesignId={designId} />;
}
