import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/service-data";
import { ServicePageContent } from "@/components/sections/ServicePageContent";

const service = SERVICES["business-cards"];

export const metadata: Metadata = {
  title: service?.name ?? "Service",
  description: service?.description ?? "",
};

export default function ServicePage() {
  if (!service) notFound();
  return <ServicePageContent service={service} designStudioHref="/services/business-cards/design" />;
}
