import type { Metadata } from "next";
import { TemplateGallery } from "@/components/business-card/template-gallery";

export const metadata: Metadata = {
  title: "Design Your Banner Online",
  description: "Choose from professionally designed vinyl banner templates or start from a blank canvas. Customize every detail and get a print-ready file in minutes.",
};

/**
 * Templates are narrowed to the orientation the customer already chose on the order page.
 *
 * Arriving from a vertical banner and being shown a wall of landscape designs means every one of
 * them has to be re-laid-out after picking it, which is exactly the work the template was supposed
 * to save. The order flow speaks in horizontal/vertical and the template records
 * landscape/portrait, so the two vocabularies meet here.
 */
export default async function BannerDesignPage({
  searchParams,
}: {
  searchParams: Promise<{ orientation?: string }>;
}) {
  const { orientation: raw } = await searchParams;
  const orientation =
    raw === "vertical" ? "portrait" : raw === "horizontal" ? "landscape" : undefined;

  return (
    <div className="section-pad container-tight">
      <div className="mb-10 text-center">
        <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-kc-teal">Design Studio</div>
        <h1 className="mb-4 text-4xl font-black tracking-tight text-kc-dark sm:text-5xl">Design Your Banner</h1>
        <p className="mx-auto max-w-xl text-lg text-kc-muted">
          Pick a template or start from scratch. Edit every detail, add your logo, and download a print-ready file. No design experience required.
        </p>
        {orientation && (
          <p className="mx-auto mt-3 max-w-xl text-sm text-kc-muted">
            Showing {orientation === "portrait" ? "vertical" : "horizontal"} designs.{" "}
            <a
              href="/services/banners/design"
              className="font-semibold text-kc-magenta-deep transition-colors hover:text-kc-dark"
            >
              Show all
            </a>
          </p>
        )}
      </div>
      <TemplateGallery product="banner" orientation={orientation} />
    </div>
  );
}
