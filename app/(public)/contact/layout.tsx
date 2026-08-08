import type { Metadata } from "next";
import { localeAlternates } from "@/lib/i18n/metadata";

// The contact page itself is a Client Component (react-hook-form), which cannot export `metadata`,
// so it was silently inheriting the site-wide default title and description. This layout supplies
// the page-specific values.
export const metadata: Metadata = {
  alternates: localeAlternates("/contact", "en"),
  title: "Contact 611 Printing - Get a Quote",
  description:
    "Call, text, or message 611 Printing about business cards, postcards, banners, and rigid signs. Kansas City based, serving clients nationwide online.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
