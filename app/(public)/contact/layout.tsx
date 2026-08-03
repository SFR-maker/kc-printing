import type { Metadata } from "next";

// The contact page itself is a Client Component (react-hook-form), which cannot export `metadata`,
// so it was silently inheriting the site-wide default title and description. This layout supplies
// the page-specific values.
export const metadata: Metadata = {
  title: "Contact KC Printing - Get a Quote",
  description:
    "Call, text, or message KC Printing about business cards, postcards, banners, and rigid signs. Kansas City based, serving clients nationwide online.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
