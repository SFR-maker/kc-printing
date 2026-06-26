import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/service-data";
import { ProductBuilder } from "@/components/builder/ProductBuilder";
const service = SERVICES["postcards"];

export default function OrderPage({ searchParams }: { searchParams: Promise<{ package?: string }> }) {
  if (!service) notFound();
  return <ProductBuilder service={service} defaultPackage={undefined} />;
}
