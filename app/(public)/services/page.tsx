import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Design Services - Business Cards, Banners, Logos, Websites",
  description:
    "Browse all KC Printing services: business cards, postcards, vinyl banners, roll-up banners, logo design, website design, and general print design.",
};

const SERVICES = [
  {
    slug: "business-cards",
    name: "Business Cards",
    icon: "🪪",
    tag: "Print",
    price: "from $39",
    description:
      "Standard, square, slim, circle, and leaf shapes. 14-32pt paper options. 300-350 DPI print-ready files with proper bleed.",
    highlights: ["Standard 2 x 3.5 in", "Special shapes available", "Multiple paper weights", "Up to 8 revisions"],
    color: "bg-kc-teal/5 border-kc-teal/20",
  },
  {
    slug: "postcards",
    name: "Postcards",
    icon: "📬",
    tag: "Print",
    price: "from $49",
    description:
      "Multiple sizes from 3x5 to 6x11. Front and back design, EDDM-ready mailing options, and rounded corners.",
    highlights: ["6 popular sizes", "EDDM-ready option", "Front and back design", "Up to 8 revisions"],
    color: "bg-kc-coral/5 border-kc-coral/20",
  },
  {
    slug: "logo-design",
    name: "Logo Design",
    icon: "✦",
    tag: "Branding",
    price: "from $100",
    description:
      "Professional logos with full ownership transfer. All formats delivered: EPS, PDF, high-resolution JPG, transparent PNG, and SVG.",
    highlights: ["Full ownership transfer", "All file formats", "Brand color palette", "Up to 8 revisions"],
    color: "bg-kc-yellow/10 border-kc-yellow/30",
  },
  {
    slug: "web-design",
    name: "Website Design",
    icon: "🌐",
    tag: "Web",
    price: "from $299",
    description:
      "SEO-optimized, mobile-ready website design. From one-page landing pages to full e-commerce and booking systems.",
    highlights: ["Mobile responsive", "SEO-optimized", "AI content package", "Maintenance available"],
    color: "bg-kc-teal/5 border-kc-teal/20",
  },
  {
    slug: "roll-up-banners",
    name: "Roll-Up Banners",
    icon: "🎯",
    tag: "Print",
    price: "from $79",
    description:
      "Retractable banner stand designs from 24x81 to 36x81 in. Print-ready files with correct bleed and safe zone guidelines.",
    highlights: ["3 standard sizes", "Table-top option", "Bleed and safe zone included", "Up to 8 revisions"],
    color: "bg-kc-sage/10 border-kc-sage/30",
  },
  {
    slug: "vinyl-banners",
    name: "Vinyl Banners",
    icon: "🏷",
    tag: "Print",
    price: "from $79",
    description:
      "Large format vinyl banner designs for events, storefronts, and outdoor promotions. Multiple sizes and materials.",
    highlights: ["Sizes 2x4 to 4x10", "Mesh, gloss, and matte", "Grommet placement spec", "Up to 8 revisions"],
    color: "bg-kc-coral/5 border-kc-coral/20",
  },
  {
    slug: "print-design",
    name: "Print and Brand Design",
    icon: "🖨",
    tag: "Print",
    price: "from $59",
    description:
      "Flyers, brochures, letterheads, rack cards, and general brand design. Print-ready files for any printer.",
    highlights: ["Single and multi-page", "Any print format", "Brand consistency", "Up to 8 revisions"],
    color: "bg-kc-yellow/10 border-kc-yellow/30",
  },
];

export default function ServicesPage() {
  return (
    <div className="section-pad container-tight">
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-kc-teal/10 text-kc-teal border-kc-teal/20">All Services</Badge>
        <h1 className="text-4xl sm:text-5xl font-black text-kc-dark mb-4">Everything Your Brand Needs</h1>
        <p className="text-kc-muted text-lg max-w-2xl mx-auto">
          One studio for all your print and digital design. Original work, real designers, fast turnaround, print-ready files.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-16">
        {SERVICES.map((s) => (
          <Card key={s.slug} className={`border ${s.color} hover:shadow-lg transition-all duration-200 group`}>
            <CardContent className="p-6 flex flex-col h-full">
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{s.icon}</span>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-xs bg-kc-bg border-kc-border text-kc-muted">{s.tag}</Badge>
                  <Badge className="text-xs bg-kc-yellow/30 text-kc-dark border-0">{s.price}</Badge>
                </div>
              </div>
              <h2 className="text-xl font-bold text-kc-dark group-hover:text-kc-teal transition-colors mb-2">{s.name}</h2>
              <p className="text-sm text-kc-muted leading-relaxed mb-4 flex-1">{s.description}</p>
              <ul className="space-y-1.5 mb-5">
                {s.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-xs text-kc-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-kc-teal shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full bg-kc-teal hover:bg-kc-teal/90 text-white mt-auto">
                <Link href={`/services/${s.slug}`}>
                  View Details <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-violet-card p-8 text-center text-white sm:p-12">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/[0.04] blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-16 h-48 w-48 rounded-full bg-orange-500/[0.10] blur-2xl" />
        <div className="relative z-10">
          <h2 className="mb-3 text-2xl font-black sm:text-3xl">Not Sure Where to Start?</h2>
          <p className="mx-auto mb-6 max-w-xl text-white/80">
            Call or text us at (816) 521-0462 and we will help you choose the right package for your project and budget.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild className="rounded-xl bg-kc-coral hover:bg-kc-coral/90 text-white shadow-orange-glow">
              <Link href="/contact">Get a Free Quote</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl border-white/30 text-white hover:bg-white/10">
              <Link href="/pricing">Compare All Pricing</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
