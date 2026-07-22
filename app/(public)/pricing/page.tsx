import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDollars } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Transparent Pricing for All Design Services",
  description:
    "Clear, upfront pricing for business cards, postcards, and banners. No hidden fees. Multiple packages to fit any budget.",
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
];

export default function PricingPage() {
  return (
    <div>
      <div className="section-pad-tight bg-kc-bg">
        <div className="container-tight max-w-2xl">
          <h1 className="mb-3 text-4xl font-black tracking-tight text-kc-dark sm:text-5xl">Clear, simple pricing</h1>
          <p className="text-lg text-kc-muted">
            No hidden fees, no contracts. Every package includes revisions and print-ready file delivery.
          </p>
        </div>
      </div>

      <div className="container-tight px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-14">
          {ALL_SERVICES.map((service) => (
            <div key={service.name}>
              <div className="mb-5 flex items-center justify-between border-b border-kc-border pb-3">
                <h2 className="text-xl font-bold text-kc-dark">{service.name}</h2>
                <Link href={service.href} className="flex items-center gap-1 text-sm font-medium text-kc-teal hover:underline">
                  View details <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {service.packages.map((pkg) => (
                  <div
                    key={pkg.name}
                    className={`rounded-md border p-5 ${pkg.popular ? "border-kc-teal bg-kc-violet-tint" : "border-kc-border bg-white"}`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-kc-muted">{pkg.name}</span>
                      {pkg.popular && <span className="text-[10px] font-bold uppercase tracking-wide text-kc-teal">Most popular</span>}
                    </div>
                    <div className="mb-3 text-3xl font-black text-kc-dark">{formatDollars(pkg.price)}</div>
                    <ul className="space-y-1.5">
                      {pkg.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs text-kc-muted">
                          <Check className="h-3.5 w-3.5 shrink-0 text-kc-teal" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      asChild
                      size="sm"
                      className={`mt-4 w-full rounded-md ${pkg.popular ? "bg-kc-teal text-white hover:bg-kc-teal/90" : "bg-kc-dark text-white hover:bg-kc-dark/90"}`}
                    >
                      <Link href={`${service.href}/order?package=${pkg.name.toLowerCase()}`}>Select {pkg.name}</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-6 rounded-md border border-kc-border bg-kc-orange-tint p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="mb-1.5 text-xl font-bold text-kc-dark">Have a custom project?</h2>
            <p className="text-sm text-kc-muted">Not sure which package fits? Contact us for a free quote.</p>
          </div>
          <Button asChild className="shrink-0 rounded-md bg-kc-coral text-white hover:bg-kc-coral/90">
            <Link href="/contact">Request a Quote</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
