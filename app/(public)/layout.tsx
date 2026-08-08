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
      <main id="main-content" className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
