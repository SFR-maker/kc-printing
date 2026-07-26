import type { Metadata } from "next";
import { TemplateGallery } from "@/components/business-card/template-gallery";

export const metadata: Metadata = {
  title: "Design Your Rigid Sign Online",
  description: "Choose from professionally designed die-cut sign templates in circle, star, arrow, house, and rounded-square shapes, or start from a blank canvas. Customize every detail and get a print-ready file in minutes.",
};

export default function RigidSignDesignPage() {
  return (
    <div className="section-pad container-tight">
      <div className="mb-10 text-center">
        <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-kc-teal">Design Studio</div>
        <h1 className="mb-4 text-4xl font-black tracking-tight text-kc-dark sm:text-5xl">Design Your Rigid Sign</h1>
        <p className="mx-auto max-w-xl text-lg text-kc-muted">
          Pick a template or start from scratch. Edit every detail, add your logo, and download a print-ready file cut to your chosen shape. No design experience required.
        </p>
      </div>
      <TemplateGallery product="rigid-sign" />
    </div>
  );
}
