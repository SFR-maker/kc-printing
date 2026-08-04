import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";
import { TERMS_SECTIONS, TERMS_UPDATED_LABEL } from "@/lib/legal/terms";

export const metadata: Metadata = {
  title: "Terms of Sale",
  description: "611 Printing Terms of Sale covering proof approval, artwork requirements, colour, quantities, shipping and refunds.",
};

export default function TermsPage() {
  return <LegalPage title="Terms of Sale" updated={TERMS_UPDATED_LABEL} sections={TERMS_SECTIONS} />;
}
