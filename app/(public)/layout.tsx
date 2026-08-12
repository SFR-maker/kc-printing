import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PromoBar } from "@/components/layout/PromoBar";
import { getBarSpecial } from "@/lib/specials";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // Read here rather than inside PromoBar so the strip is server-rendered into the HTML: a promotion
  // that appears a beat after the page has painted pushes the whole header down under the reader.
  const special = await getBarSpecial();

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <PromoBar special={special} />
      <Header />
      {/* tabIndex -1 so the skip link actually moves the reading position. Without it the
          browser moves its sequential-focus point but activeElement stays on <body>, so a
          screen reader carries on reading from the top of the page. */}
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">{children}</main>
      <Footer />
    </>
  );
}
