import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClosingCta } from "@/components/layout/ClosingCta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { formatDollars } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Transparent Pricing for All Design Services",
  description:
    "Clear, upfront pricing for business cards, postcards, banners, and rigid signs. No hidden fees. Multiple packages to fit any budget.",
};

const ALL_SERVICES = [
  {
    name: "Business Cards",
    href: "/services/business-cards",
    packages: [
      { name: "Silver", price: 39, features: ["1-2 images", "Up to 4 revisions", "PDF and JPG"] },
      { name: "Gold", price: 49, popular: true, features: ["3-4 images", "Up to 6 revisions", "PDF, JPG, PNG"] },
      { name: "Platinum", price: 69, features: ["5+ images", "Up to 8 revisions", "Full bundle"] },
    ],
  },
  {
    name: "Postcards",
    href: "/services/postcards",
    packages: [
      { name: "Silver", price: 49, features: ["1-2 images", "Up to 4 revisions", "Front only"] },
      { name: "Gold", price: 69, popular: true, features: ["3-4 images", "Up to 6 revisions", "Front and back"] },
      { name: "Platinum", price: 89, features: ["5+ images", "Up to 8 revisions", "EDDM-ready"] },
    ],
  },
  {
    name: "Banners",
    href: "/services/banners",
    packages: [
      { name: "Silver", price: 79, features: ["1-2 images", "Up to 4 revisions", "PDF with bleed"] },
      { name: "Gold", price: 139, popular: true, features: ["3-4 images", "Up to 6 revisions", "Two concepts"] },
      { name: "Platinum", price: 199, features: ["5+ images", "Up to 8 revisions", "Three concepts"] },
    ],
  },
  {
    name: "Rigid Signs",
    href: "/services/rigid-signs",
    packages: [
      { name: "Silver", price: 59, features: ["1-2 images", "Up to 4 revisions", "PDF with die line"] },
      { name: "Gold", price: 99, popular: true, features: ["3-4 images", "Up to 6 revisions", "Two concepts"] },
      { name: "Platinum", price: 149, features: ["5+ images", "Up to 8 revisions", "Three concepts"] },
    ],
  },
];

export default function PricingPage() {
  return (
    <>
      <PageHeader
        title="Clear, simple pricing"
        lead="No hidden fees, no contracts. Every package includes revisions and print-ready file delivery."
      />

      <section className="band-tight bg-kc-paper">
        <div className="container-tight space-y-16">
          {ALL_SERVICES.map((service) => (
            <div key={service.name}>
              <Reveal className="mb-6 flex flex-wrap items-baseline justify-between gap-3 border-b border-kc-dark/12 pb-4">
                <h2 className="display-tight text-2xl text-kc-dark sm:text-[1.9rem]">
                  {service.name}
                </h2>
                <Link
                  href={service.href}
                  className="flex items-center gap-1.5 text-[14px] font-semibold text-kc-magenta-deep transition-colors hover:text-kc-dark"
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
                          className={`text-[14.5px] font-semibold ${
                            pkg.popular ? "text-white" : "text-kc-dark"
                          }`}
                        >
                          {pkg.name}
                        </span>
                        {pkg.popular && (
                          <span className="font-mono text-[11px] text-white/60">Most popular</span>
                        )}
                      </div>

                      <div
                        className={`display-tight mt-3 text-[2.25rem] ${
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
                            className={`text-[13.5px] leading-snug ${
                              pkg.popular ? "text-white/70" : "text-kc-dark/65"
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
                            ? "edge mt-6 h-11 w-full bg-kc-coral text-[14px] font-semibold text-white transition-colors hover:bg-kc-magenta-deep"
                            : "edge mt-6 h-11 w-full border border-kc-dark/20 bg-transparent text-[14px] font-semibold text-kc-dark transition-colors hover:border-kc-dark/40 hover:bg-kc-dark/5"
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
        body="Not sure which package fits, or need something outside these four products? Tell us what you're planning and we'll quote it."
        primary={{ label: "Contact us", href: "/contact" }}
        secondary={{ label: "Browse products", href: "/services" }}
        showContactDetails
      />
    </>
  );
}
