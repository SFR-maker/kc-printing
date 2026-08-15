import type { Metadata } from "next";
import { localeAlternates } from "@/lib/i18n/metadata";

// Holds the page's title and description. It lived here because the contact page used to be a
// Client Component (react-hook-form) and so could not export `metadata` at all; the form has since
// moved to components/contact/ContactForm and the page is a Server Component again, but the values
// stay here rather than moving for the sake of moving.
export const metadata: Metadata = {
  alternates: localeAlternates("/contact", "en"),
  title: "Contact 611 Printing - Get a Quote",
  description:
    "Call, text, or message 611 Printing about business cards, postcards, banners, rigid signs, and window decals. Kansas City based, serving clients nationwide.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
