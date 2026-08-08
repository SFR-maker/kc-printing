import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/service-data";
import { ServicePageContent } from "@/components/sections/ServicePageContent";
import { getFeaturedThumbnails } from "@/lib/product-thumbnails";
import { localeAlternates } from "@/lib/i18n/metadata";

const service = SERVICES["banners"];

export const metadata: Metadata = {
  alternates: localeAlternates("/services/banners", "en"),
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
