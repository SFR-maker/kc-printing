import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Design Services - Business Cards, Postcards, Banners, Rigid Signs",
  description:
    "Browse all 611 Printing services: business cards, postcards, banners (roll-up stands and vinyl), and die-cut rigid signs.",
};

const SERVICES = [
  {
    slug: "business-cards",
    name: "Business Cards",
    image: "/images/print/business-cards.webp",
    alt: "Three stacks of printed business cards in cyan, magenta, and gold with visible cut edges",
    price: "from $39",
    description: "Standard, square, slim, circle, or leaf shapes, in 14 to 32pt paper. Files come back print-ready at 300-350 DPI with proper bleed.",
    highlights: ["Standard 2 × 3.5 in, plus specialty shapes", "14pt to 32pt paper weights", "Up to 8 revisions included"],
  },
  {
    slug: "postcards",
    name: "Postcards",
    image: "/images/print/postcards.webp",
    alt: "A loose pile of printed postcards on a concrete surface",
    price: "from $49",
    description: "Six popular sizes from 3×5 to 6×11, front-and-back design, and EDDM-ready layouts for mail campaigns.",
    highlights: ["3×5 up to 6×11, EDDM-ready", "Front and back design", "Up to 8 revisions included"],
  },
  {
    slug: "banners",
    name: "Banners",
    image: "/images/print/banners.webp",
    alt: "A retractable roll-up banner stand printed with cyan, magenta, and gold bands",
    price: "from $79",
    description: "Retractable roll-up stands for trade shows and offices, or large-format vinyl for storefronts and outdoor events.",
    highlights: ["Roll-up stands and vinyl, 24″ to 10 ft", "Bleed, safe zone, and grommet specs included", "Up to 8 revisions included"],
  },
  {
    slug: "rigid-signs",
    name: "Rigid Signs",
    image: "/images/print/rigid-signs.webp",
    alt: "Four die-cut rigid signs leaning against a studio wall",
    price: "from $59",
    description: "Die-cut rigid signage in circle, star, arrow, house, or rounded-square shapes, available in acrylic, aluminum, PVC, foam board, or corrugated plastic.",
    highlights: ["5 shapes, 5 materials", "Print-ready file with die line included", "Up to 8 revisions included"],
  },
];

export default function ServicesPage() {
  return (
    <>
      <section className="bg-kc-bg">
        <div className="reg-bar" />
        <div className="container-tight px-4 pb-12 pt-16 sm:px-6 lg:px-8 lg:pb-16 lg:pt-24">
          <Reveal className="max-w-2xl">
            <h1 className="display-tight text-[2.94rem] text-kc-dark sm:text-6xl">All services</h1>
            <p className="mt-5 text-[18.19px] leading-relaxed text-kc-dark/75">
              Four products, each built around a designer who knows the format, not a template
              engine.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="band-tight bg-kc-paper">
        <div className="container-tight">
          <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((s) => (
              <RevealItem key={s.slug} className="h-full">
                <Link
                  href={`/services/${s.slug}`}
                  className="edge group flex h-full flex-col overflow-hidden border border-kc-dark/12 bg-white transition-colors hover:border-kc-dark/30"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-kc-paper">
                    <Image
                      src={s.image}
                      alt={s.alt}
                      fill
                      sizes="(min-width: 1024px) 24vw, (min-width: 640px) 48vw, 100vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-3 flex items-baseline justify-between gap-2">
                      <h2 className="display-tight text-xl text-kc-dark transition-colors group-hover:text-kc-magenta-deep">
                        {s.name}
                      </h2>
                      <span className="shrink-0 font-mono text-[13.38px] text-kc-dark/70">
                        {s.price}
                      </span>
                    </div>
                    <p className="mb-5 flex-1 text-[14.45px] leading-relaxed text-kc-dark/70">
                      {s.description}
                    </p>
                    <ul className="mb-5 space-y-1.5 border-t border-kc-dark/10 pt-4">
                      {s.highlights.map((h) => (
                        <li key={h} className="text-xs leading-snug text-kc-dark/70">
                          {h}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex items-center gap-1.5 text-[14.98px] font-semibold text-kc-magenta-deep">
                      View {s.name}
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                        strokeWidth={2}
                      />
                    </div>
                  </div>
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <section className="bg-kc-bg">
        <div className="container-tight px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="flex flex-col items-start justify-between gap-7 border-t border-kc-dark/12 pt-10 sm:flex-row sm:items-end">
            <div>
              <h2 className="display-tight text-2xl text-kc-dark sm:text-[2.03rem]">
                Not sure where to start?
              </h2>
              <p className="mt-3 max-w-md text-[16.05px] leading-relaxed text-kc-dark/70">
                Call or text (816) 521-0462 and we&apos;ll help you pick the right product and
                package.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="edge h-12 bg-kc-coral px-7 text-[16.05px] font-semibold text-white transition-colors hover:bg-kc-magenta-deep"
              >
                <Link href="/contact">Contact us</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="edge h-12 border border-kc-dark/20 bg-transparent px-7 text-[16.05px] font-semibold text-kc-dark transition-colors hover:border-kc-dark/40 hover:bg-kc-dark/5"
              >
                <Link href="/pricing">Compare pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
