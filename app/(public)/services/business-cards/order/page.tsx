import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/service-data";
import { ProductBuilder } from "@/components/builder/ProductBuilder";
const service = SERVICES["business-cards"];

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ package?: string; designId?: string }> }) {
  if (!service) notFound();
  const { package: pkg, designId } = await searchParams;
  return <ProductBuilder service={service} defaultPackage={pkg} cardDesignId={designId} />;
}
