import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/service-data";
import { ServicePageContent } from "@/components/sections/ServicePageContent";
import { getFeaturedThumbnails } from "@/lib/product-thumbnails";
import { localeAlternates } from "@/lib/i18n/metadata";

const service = SERVICES["window-decals"];

/**
 * The three films, photographed doing the thing that distinguishes them.
 *
 * Descriptions match lib/pricing/window-decals' blurbs, which is what the order form shows once a
 * film is selected, so the page and the picker say the same thing.
 */
const FILMS = [
  {
    name: "Window Decal",
    src: "/images/print/window-decals.webp",
    alt: "A rectangular vinyl decal applied flat to a shop window, seen from the pavement",
    description: "Adhesive vinyl. Sticks to any clean flat surface, inside or out, and holds up for three to five years outdoors.",
  },
  {
    name: "Window Cling",
    src: "/images/print/window-decals-cling.webp",
    alt: "Hands smoothing a static cling decal onto the inside of a shop window with a felt squeegee",
    description: "Static cling. No adhesive at all, so it repositions freely and is the one to pick for an offer you change monthly.",
  },
  {
    name: "Window Perf",
    src: "/images/print/window-decals-perf.webp",
    alt: "Perforated window film seen from inside a cafe, its dot pattern visible against the street outside",
    description: "Perforated film. Reads as a solid graphic from the street while your staff and customers can still see out.",
  },
];

export const metadata: Metadata = {
  alternates: localeAlternates("/services/window-decals", "en"),
  title: service?.name ?? "Service",
  description: service?.description ?? "",
};

export const revalidate = 3600;

export default async function ServicePage() {
  if (!service) notFound();
  const heroImages = await getFeaturedThumbnails("window-decals");
  return (
    <ServicePageContent
      service={service}
      designStudioHref="/services/window-decals/design"
      heroImages={heroImages}
      variants={FILMS}
    />
  );
}
