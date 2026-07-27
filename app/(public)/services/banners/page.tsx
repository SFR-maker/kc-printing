import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/service-data";
import { ServicePageContent } from "@/components/sections/ServicePageContent";
import { getFeaturedThumbnails } from "@/lib/product-thumbnails";

const service = SERVICES["banners"];

export const metadata: Metadata = {
  title: service?.name ?? "Service",
  description: service?.description ?? "",
};

export const revalidate = 3600;

export default async function ServicePage() {
  if (!service) notFound();
  const heroImages = await getFeaturedThumbnails("banners");
  return (
    <ServicePageContent
      service={service}
      designStudioHref="/services/banners/design"
      aiDesignHref="/services/banners/design?startAi=1"
      heroImages={heroImages}
    />
  );
}
