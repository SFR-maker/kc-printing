import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClosingCta } from "@/components/layout/ClosingCta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { formatDollars } from "@/lib/utils";
import { localeAlternates } from "@/lib/i18n/metadata";
import { SERVICES } from "@/lib/service-data";
import { STARTING_PRICES } from "@/lib/pricing/starting-prices";

export const metadata: Metadata = {
  alternates: localeAlternates("/pricing", "en"),
  title: "Transparent Pricing for All Design Services",
  description:
    "Clear, upfront pricing for business cards, postcards, banners, rigid signs, and window decals. No hidden fees. Multiple packages to fit any budget.",
};

/**
 * The order the products are listed in. Everything else - names, tiers, prices - comes from
 * lib/service-data.
 *
 * This page used to carry its own copy of all fifteen package prices. They happened to agree with
 * the service pages, but nothing made them: an owner raising the Gold banner package to $149 would
 * have changed it in one place and left this page quoting $139, with no test and no type error to
 * say so. A summary of prices has to read them from wherever they are charged.
 */
const SERVICE_ORDER = ["business-cards", "postcards", "banners", "rigid-signs", "window-decals"];

/**
 * The three-word summary of each tier, shortened for a page that shows fifteen cards at once.
 *
 * Deliberately not the price and not the tier name - only the wording. Anything a customer could
 * compare against another page is read from SERVICES.
 */
const TIER_BLURBS: Record<string, string[]> = {
  "business-cards": ["1-2 images", "Up to 4 revisions", "PDF and JPG"],
  "business-cards:Gold": ["3-4 images", "Up to 6 revisions", "PDF, JPG, PNG"],
  "business-cards:Platinum": ["5+ images", "Up to 8 revisions", "Full bundle"],
  postcards: ["1-2 images", "Up to 4 revisions", "Front only"],
  "postcards:Gold": ["3-4 images", "Up to 6 revisions", "Front and back"],
  "postcards:Platinum": ["5+ images", "Up to 8 revisions", "EDDM-ready"],
  banners: ["1-2 images", "Up to 4 revisions", "PDF with bleed"],
  "banners:Gold": ["3-4 images", "Up to 6 revisions", "Two concepts"],
  "banners:Platinum": ["5+ images", "Up to 8 revisions", "Three concepts"],
  "rigid-signs": ["1-2 images", "Up to 4 revisions", "PDF with die line"],
  "rigid-signs:Gold": ["3-4 images", "Up to 6 revisions", "Two concepts"],
  "rigid-signs:Platinum": ["5+ images", "Up to 8 revisions", "Three concepts"],
  "window-decals": ["1-2 images", "Up to 4 revisions", "PDF with cut line"],
  "window-decals:Gold": ["3-4 images", "Up to 6 revisions", "Two concepts"],
  "window-decals:Platinum": ["5+ images", "Up to 8 revisions", "Three concepts"],
};

const ALL_SERVICES = SERVICE_ORDER.map((slug) => {
  const service = SERVICES[slug];
  return {
    name: service.name,
    href: `/services/${service.slug}`,
    packages: service.packages.map((pkg) => ({
      name: pkg.name,
      price: pkg.price,
      popular: pkg.popular,
      features: TIER_BLURBS[`${slug}:${pkg.name}`] ?? TIER_BLURBS[slug],
    })),
  };
});

export default function PricingPage() {
  return (
    <>
      <PageHeader
        title="Design packages"
        lead="These are design fees: what it costs to have a designer build your artwork. Printing is priced separately and shown on each product page."
      />

      {/*
        Two prices, said plainly.
        This page listed $39-$69 under the heading "Clear, simple pricing. No hidden fees" while the
        business cards page quoted $16.80 for 250. Both were true - one is design, one is print - but
        nothing said so, and a careful customer comparing the two concluded the shop was hiding
        something. Naming the difference here is the fix; the numbers were never wrong.
      */}
      <section className="band-tight bg-kc-bg">
        <div className="container-tight">
          <div className="rounded-2xl border-2 border-kc-border bg-white p-6">
            <h2 className="text-lg font-bold text-kc-dark">Design and printing are priced separately</h2>
            <p className="mt-2 max-w-2xl text-[16.59px] leading-relaxed text-kc-dark/75">
              The packages below cover design work only. If you already have artwork, or you use our
              free design studio, you pay for printing alone. Printing starts at{" "}
              {/* Read from the price tables, not typed. The typed figure here said $9.59 while the
                  cheapest run of 50 the configurator will actually sell is $8.39, so the page that
                  exists to explain the two prices was quoting a third one. */}
              <strong className="font-semibold text-kc-dark">
                {formatDollars(STARTING_PRICES["business-cards"])} for 50 business cards
              </strong>{" "}
              and is quoted live on each product page as you choose size, paper and quantity.
            </p>
            <p className="mt-3 text-[15px] text-kc-dark/70">
              The add-ons on a package - Rush Design, an extra concept, a QR code - buy designer
              time. How fast your job comes off the press is a separate choice, made with the rest of
              your print options on the product page.
            </p>
            <p className="mt-3 text-[15px] text-kc-dark/70">
              Shipping and sales tax are added at checkout. Nothing is added to your order that you
              have not chosen.
            </p>
            <Button asChild className="mt-5 bg-kc-coral text-white hover:bg-kc-coral/90">
              <Link href="/services/business-cards">See printing prices</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="band-tight bg-kc-paper">
        <div className="container-tight space-y-16">
          {ALL_SERVICES.map((service) => (
            <div key={service.name}>
              <Reveal className="mb-6 flex flex-wrap items-baseline justify-between gap-3 border-b border-kc-dark/12 pb-4">
                <h2 className="display-tight text-2xl text-kc-dark sm:text-[2.03rem]">
                  {service.name}
                </h2>
                <Link
                  href={service.href}
                  className="flex items-center gap-1.5 text-[14.98px] font-semibold text-kc-magenta-deep transition-colors hover:text-kc-dark"
                >
                  View details <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                </Link>
              </Reveal>

              <RevealGroup className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {service.packages.map((pkg) => (
                  <RevealItem key={pkg.name} className="h-full">
                    {/* The popular tier inverts to ink rather than being a third identical card. */}
                    <div
                      className={`edge flex h-full flex-col border p-6 ${
                        pkg.popular ? "border-kc-ink bg-kc-ink" : "border-kc-dark/12 bg-white"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span
                          className={`text-[15.52px] font-semibold ${
                            pkg.popular ? "text-white" : "text-kc-dark"
                          }`}
                        >
                          {pkg.name}
                        </span>
                        {pkg.popular && (
                          <span className="font-mono text-[11.77px] text-white/60">Most popular</span>
                        )}
                      </div>

                      <div
                        className={`display-tight mt-3 text-[2.41rem] ${
                          pkg.popular ? "text-white" : "text-kc-dark"
                        }`}
                      >
                        {formatDollars(pkg.price)}
                      </div>

                      <ul
                        className={`mt-5 flex-1 space-y-2 border-t pt-5 ${
                          pkg.popular ? "border-kc-ink-line" : "border-kc-dark/10"
                        }`}
                      >
                        {pkg.features.map((f) => (
                          <li
                            key={f}
                            className={`text-[14.45px] leading-snug ${
                              pkg.popular ? "text-white/70" : "text-kc-dark/75"
                            }`}
                          >
                            {f}
                          </li>
                        ))}
                      </ul>

                      <Button
                        asChild
                        className={
                          pkg.popular
                            ? "edge mt-6 h-11 w-full bg-kc-coral text-[14.98px] font-semibold text-white transition-colors hover:bg-kc-magenta-deep"
                            : "edge mt-6 h-11 w-full border border-kc-dark/20 bg-transparent text-[14.98px] font-semibold text-kc-dark transition-colors hover:border-kc-dark/40 hover:bg-kc-dark/5"
                        }
                      >
                        <Link href={`${service.href}/order?package=${pkg.name.toLowerCase()}`}>
                          Select {pkg.name}
                        </Link>
                      </Button>
                    </div>
                  </RevealItem>
                ))}
              </RevealGroup>
            </div>
          ))}
        </div>
      </section>

      <ClosingCta
        title="Have a custom project?"
        body="Not sure which package fits, or need something outside these five products? Tell us what you're planning and we'll quote it."
        primary={{ label: "Contact us", href: "/contact" }}
        secondary={{ label: "Browse products", href: "/services" }}
        showContactDetails
      />
    </>
  );
}
