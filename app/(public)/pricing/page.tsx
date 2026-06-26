import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDollars } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Transparent Pricing for All Design Services",
  description:
    "Clear, upfront pricing for business cards, postcards, banners, logos, and websites. No hidden fees. Multiple packages to fit any budget.",
};

const ALL_SERVICES = [
  {
    name: "Business Cards",
    href: "/services/business-cards",
    packages: [
      { name: "Silver", price: 39, features: ["1-2 images", "Up to 4 revisions", "PDF and JPG"] },
      { name: "Gold", price: 49, features: ["3-4 images", "Up to 6 revisions", "PDF, JPG, PNG"] },
      { name: "Platinum", price: 69, features: ["5+ images", "Up to 8 revisions", "Full bundle"] },
    ],
  },
  {
    name: "Postcards",
    href: "/services/postcards",
    packages: [
      { name: "Silver", price: 49, features: ["1-2 images", "Up to 4 revisions", "Front only"] },
      { name: "Gold", price: 69, features: ["3-4 images", "Up to 6 revisions", "Front and back"] },
      { name: "Platinum", price: 89, features: ["5+ images", "Up to 8 revisions", "EDDM-ready"] },
    ],
  },
  {
    name: "Logo Design",
    href: "/services/logo-design",
    packages: [
      { name: "Basic", price: 100, features: ["Text-based mark", "Up to 4 revisions", "4 formats"] },
      { name: "Plus", price: 250, features: ["Detailed mark", "Up to 6 revisions", "5 formats"] },
      { name: "Deluxe", price: 350, features: ["Illustrated logo", "Up to 8 revisions", "Brand guide"] },
    ],
  },
  {
    name: "Website Design",
    href: "/services/web-design",
    packages: [
      { name: "One Page", price: 299, features: ["Single page", "Up to 4 revisions", "Mobile-ready"] },
      { name: "5-Page Business", price: 599, features: ["5 pages", "Up to 6 revisions", "SEO structure"] },
      { name: "Full SEO Site", price: 899, features: ["10 pages", "Up to 8 revisions", "Schema markup"] },
    ],
  },
  {
    name: "Roll-Up Banners",
    href: "/services/roll-up-banners",
    packages: [
      { name: "Silver", price: 79, features: ["1-2 images", "Up to 4 revisions", "PDF with bleed"] },
      { name: "Gold", price: 139, features: ["3-4 images", "Up to 6 revisions", "Two concepts"] },
      { name: "Platinum", price: 199, features: ["5+ images", "Up to 8 revisions", "Three concepts"] },
    ],
  },
  {
    name: "Vinyl Banners",
    href: "/services/vinyl-banners",
    packages: [
      { name: "Silver", price: 79, features: ["1-2 images", "Up to 4 revisions", "PDF with bleed"] },
      { name: "Gold", price: 139, features: ["3-4 images", "Up to 6 revisions", "Two concepts"] },
      { name: "Platinum", price: 199, features: ["5+ images", "Up to 8 revisions", "Grommet spec"] },
    ],
  },
  {
    name: "Print and Brand Design",
    href: "/services/print-design",
    packages: [
      { name: "Silver", price: 59, features: ["Single page", "Up to 4 revisions", "PDF"] },
      { name: "Gold", price: 99, features: ["Two-sided", "Up to 6 revisions", "PDF and PNG"] },
      { name: "Platinum", price: 149, features: ["Multi-page", "Up to 8 revisions", "Full bundle"] },
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="section-pad container-tight">
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-kc-teal/10 text-kc-teal border-kc-teal/20">Pricing</Badge>
        <h1 className="text-4xl sm:text-5xl font-black text-kc-dark mb-4">Clear, Simple Pricing</h1>
        <p className="text-kc-muted text-lg max-w-2xl mx-auto">
          No hidden fees. No contracts. Pay for what you need. Every package includes revisions and print-ready file delivery.
        </p>
      </div>

      <div className="space-y-12">
        {ALL_SERVICES.map((service) => (
          <div key={service.name}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-kc-dark">{service.name}</h2>
              <Link href={service.href} className="text-sm text-kc-teal hover:underline flex items-center gap-1">
                Learn more <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {service.packages.map((pkg) => (
                <Card key={pkg.name} className="border-kc-border hover:border-kc-teal/30 transition-colors">
                  <CardContent className="p-5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-kc-muted mb-1">{pkg.name}</div>
                    <div className="text-3xl font-black text-kc-dark mb-3">{formatDollars(pkg.price)}</div>
                    <ul className="space-y-1.5">
                      {pkg.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs text-kc-muted">
                          <CheckCircle2 className="h-3.5 w-3.5 text-kc-teal shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button asChild size="sm" className="w-full mt-4 bg-kc-teal hover:bg-kc-teal/90 text-white">
                      <Link href={`${service.href}/order?package=${pkg.name.toLowerCase()}`}>Select</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-2xl bg-kc-dark text-white p-8 sm:p-12 text-center">
        <h2 className="text-2xl sm:text-3xl font-black mb-3">Have a Custom Project?</h2>
        <p className="text-white/70 mb-6 max-w-xl mx-auto">
          Not sure which package fits? Contact us for a free quote. We handle custom projects at fair prices with no surprises.
        </p>
        <Button asChild className="bg-kc-coral hover:bg-kc-coral/90 text-white">
          <Link href="/contact">Get a Free Quote</Link>
        </Button>
      </div>
    </div>
  );
}
