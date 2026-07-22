import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { TemplateGallery } from "@/components/business-card/template-gallery";

export const metadata: Metadata = {
  title: "Design Your Business Card Online",
  description: "Choose from 100 professionally designed business card templates or start from a blank canvas. Customize every detail and get a print-ready file in minutes.",
};

export default function BusinessCardDesignPage() {
  return (
    <div className="section-pad container-tight">
      <div className="mb-10 text-center">
        <Badge className="mb-4 border-kc-teal/20 bg-kc-teal/8 text-kc-teal">Design Studio</Badge>
        <h1 className="mb-4 text-4xl font-black tracking-tight text-kc-dark sm:text-5xl">Design Your Business Card</h1>
        <p className="mx-auto max-w-xl text-lg text-kc-muted">
          Pick a template or start from scratch. Edit every detail, add your logo, and download a print-ready file — no design experience required.
        </p>
      </div>
      <TemplateGallery />
    </div>
  );
}
