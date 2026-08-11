import type { Metadata } from "next";
import Image from "next/image";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClosingCta } from "@/components/layout/ClosingCta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { localeAlternates } from "@/lib/i18n/metadata";

export const metadata: Metadata = {
  alternates: localeAlternates("/about", "en"),
  title: "About 611 Printing - Online Design Studio",
  description:
    "611 Printing is a fully online design studio serving Kansas City, Johnson County, Dallas-Fort Worth, and businesses nationwide. Fast, professional, print-ready.",
};

// Real, verifiable facts only — no client counts, ratings, or years-in-business claims until
// there's real data to back them.
const FACTS = [
  { value: "5", label: "Products, kept deliberately narrow" },
  { value: "24hr", label: "Rush turnaround available" },
  { value: "8", label: "Maximum revisions per order" },
  { value: "100%", label: "Online, no in-person visit needed" },
];

const AREAS = [
  "Kansas City, MO",
  "Johnson County, KS",
  "Dallas-Fort Worth, TX",
  "Nationwide Online",
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="A studio built for the modern business owner"
        lead="611 Printing is a fully online print and design studio based in the Kansas City metro. We help small and mid-size businesses get professional design work done fast, at a fair price, without the overhead of a traditional agency."
      />

      {/* Facts rail */}
      <section className="border-y border-kc-dark/10 bg-kc-bg">
        <div className="container-tight px-4 sm:px-6 lg:px-8">
          <RevealGroup className="grid grid-cols-2 divide-kc-dark/10 sm:grid-cols-4 sm:divide-x">
            {FACTS.map((fact) => (
              <RevealItem key={fact.label} className="py-8 sm:px-7 sm:first:pl-0 sm:last:pr-0">
                <div className="display-tight text-[2.41rem] text-kc-dark">{fact.value}</div>
                <div className="mt-2 text-[14.45px] leading-snug text-kc-dark/70">{fact.label}</div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* What we do, set against the press-sheet photograph */}
      <section className="band bg-kc-paper">
        <div className="container-tight grid grid-cols-1 gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div>
            <h2 className="display-tight text-3xl text-kc-dark sm:text-[2.68rem]">What we do</h2>
            <div className="mt-6 space-y-5 text-[17.66px] leading-relaxed text-kc-dark/75">
              <p>
                We specialize in five things and do them well: business cards, postcards, banners,
                rigid signs, and window decals. Every order is handled by a real designer who cares
                about your brand.
              </p>
              <p>
                We use AI tools to speed up the early creative process, but every design is reviewed
                and refined by a human before it reaches you.
              </p>
              <p>
                All file delivery is digital. We&apos;re a fully online studio, so we serve
                businesses anywhere in the United States while keeping our roots in Kansas City.
              </p>
            </div>
          </div>

          <Reveal className="lg:pt-2">
            <div className="edge relative aspect-[4/3] w-full overflow-hidden">
              <Image
                src="/images/print/press-sheet.webp"
                alt="A freshly printed press sheet showing registration targets and process-ink control patches"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Service areas */}
      <section className="band bg-kc-bg">
        <div className="container-tight grid grid-cols-1 gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
          <h2 className="display-tight text-3xl text-kc-dark sm:text-[2.68rem]">Where we serve</h2>
          <ul className="grid grid-cols-1 gap-x-12 sm:grid-cols-2">
            {AREAS.map((city) => (
              <li
                key={city}
                className="border-b border-kc-dark/10 py-4 text-[16.59px] text-kc-dark first:border-t sm:[&:nth-child(2)]:border-t"
              >
                {city}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ClosingCta
        title="Have a project in mind?"
        body="Call, text, or send a message. We respond quickly."
        primary={{ label: "Contact us", href: "/contact" }}
        secondary={{ label: "Browse products", href: "/services" }}
        showContactDetails
      />
    </>
  );
}
