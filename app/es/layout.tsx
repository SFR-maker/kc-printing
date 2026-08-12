import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PromoBar } from "@/components/layout/PromoBar";
import { getBarSpecial } from "@/lib/specials";

/**
 * The Spanish site.
 *
 * A sibling of the (public) route group rather than a `[locale]` segment wrapping both: turning the
 * whole app into a dynamic locale segment would have moved every existing English URL, which is the
 * one thing a working storefront with indexed pages must not do for the sake of adding a language.
 *
 * The `lang` attribute is set on a wrapper element rather than on <html>, which the root layout
 * owns. It is what tells a screen reader to switch to a Spanish voice - without it the whole page is
 * read aloud with English pronunciation rules, which is close to unintelligible.
 */

export const metadata: Metadata = {
  // Overrides the root layout's English template for every page beneath this one.
  title: {
    default: "611 Printing - Tarjetas de presentación, postales y lonas, diseñadas en línea",
    template: "%s | 611 Printing",
  },
  description:
    "Tarjetas de presentación, postales, lonas, letreros rígidos y calcomanías para ventanas, diseñados por un diseñador real y entregados listos para imprenta. Servimos Kansas City, Johnson County, Dallas-Fort Worth y todo el país.",
  openGraph: {
    type: "website",
    siteName: "611 Printing",
    locale: "es_US",
  },
};

export default async function SpanishLayout({ children }: { children: React.ReactNode }) {
  const special = await getBarSpecial("es");

  return (
    // The root layout's <body> is a flex column that the English layout's fragment participates in
    // directly. This wrapper has to carry the same flex behaviour or `main`'s flex-1 has nothing to
    // grow against, and the footer floats up under short pages instead of sitting at the bottom.
    <div lang="es" className="flex min-h-full flex-1 flex-col">
      <a href="#main-content" className="skip-link">Ir al contenido</a>
      <PromoBar special={special} />
      <Header />
      {/* tabIndex -1 so the skip link actually moves the reading position. Without it the
          browser moves its sequential-focus point but activeElement stays on <body>, so a
          screen reader carries on reading from the top of the page. */}
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">{children}</main>
      <Footer locale="es" />
    </div>
  );
}
