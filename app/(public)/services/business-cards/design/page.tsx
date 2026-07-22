import type { Metadata } from "next";
import { TemplateGallery } from "@/components/business-card/template-gallery";

export const metadata: Metadata = {
  title: "Design Your Business Card Online",
  description: "Choose from 100 professionally designed business card templates or start from a blank canvas. Customize every detail and get a print-ready file in minutes.",
};

export default function BusinessCardDesignPage() {
  return (
    <div className="section-pad container-tight">
      <div className="mb-10 text-center">
        <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-kc-teal">Design Studio</div>
        <h1 className="mb-4 text-4xl font-black tracking-tight text-kc-dark sm:text-5xl">Design Your Business Card</h1>
        <p className="mx-auto max-w-xl text-lg text-kc-muted">
          Pick a template or start from scratch. Edit every detail, add your logo, and download a print-ready file — no design experience required.
        </p>
      </div>
      <TemplateGallery />
    </div>
  );
}
