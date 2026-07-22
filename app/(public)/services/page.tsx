import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Design Services - Business Cards, Postcards, Banners",
  description:
    "Browse all KC Printing services: business cards, postcards, and banners (roll-up stands and vinyl).",
};

const SERVICES = [
  {
    slug: "business-cards",
    name: "Business Cards",
    price: "from $39",
    description: "Standard, square, slim, circle, or leaf shapes, in 14 to 32pt paper. Files come back print-ready at 300-350 DPI with proper bleed.",
    highlights: ["Standard 2 × 3.5 in, plus specialty shapes", "14pt to 32pt paper weights", "Up to 8 revisions included"],
    accent: "bg-kc-teal",
  },
  {
    slug: "postcards",
    name: "Postcards",
    price: "from $49",
    description: "Six popular sizes from 3×5 to 6×11, front-and-back design, and EDDM-ready layouts for mail campaigns.",
    highlights: ["3×5 up to 6×11, EDDM-ready", "Front and back design", "Up to 8 revisions included"],
    accent: "bg-kc-coral",
  },
  {
    slug: "banners",
    name: "Banners",
    price: "from $79",
    description: "Retractable roll-up stands for trade shows and offices, or large-format vinyl for storefronts and outdoor events.",
    highlights: ["Roll-up stands and vinyl, 24″ to 10 ft", "Bleed, safe zone, and grommet specs included", "Up to 8 revisions included"],
    accent: "bg-kc-yellow",
  },
];

export default function ServicesPage() {
  return (
    <div>
      <div className="section-pad-tight bg-kc-bg">
        <div className="container-tight max-w-2xl">
          <h1 className="mb-3 text-4xl font-black tracking-tight text-kc-dark sm:text-5xl">All Services</h1>
          <p className="text-lg text-kc-muted">
            Three products, each built around a designer who knows the format — not a template engine.
          </p>
        </div>
      </div>

      <div className="container-tight px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <Link key={s.slug} href={`/services/${s.slug}`} className="group flex flex-col overflow-hidden rounded-md border border-kc-border bg-white transition-colors hover:border-kc-teal/40">
              <div className={`h-1.5 w-full ${s.accent}`} />
              <div className="flex flex-1 flex-col p-6">
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <h2 className="text-xl font-bold text-kc-dark group-hover:text-kc-teal transition-colors">{s.name}</h2>
                  <span className="shrink-0 text-sm font-semibold text-kc-teal">{s.price}</span>
                </div>
                <p className="mb-4 flex-1 text-sm leading-relaxed text-kc-muted">{s.description}</p>
                <ul className="mb-5 space-y-1.5 border-t border-kc-border pt-4">
                  {s.highlights.map((h) => (
                    <li key={h} className="text-xs text-kc-muted">{h}</li>
                  ))}
                </ul>
                <div className="mt-auto flex items-center gap-1 text-sm font-semibold text-kc-teal">
                  View {s.name} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-6 rounded-md border border-kc-border bg-kc-violet-tint p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="mb-1.5 text-xl font-bold text-kc-dark">Not sure where to start?</h2>
            <p className="text-sm text-kc-muted">
              Call or text (816) 521-0462 and we&apos;ll help you pick the right product and package.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Button asChild className="rounded-md bg-kc-teal text-white hover:bg-kc-teal/90">
              <Link href="/contact">Request a Quote</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-md border-kc-border text-kc-dark hover:bg-white">
              <Link href="/pricing">Compare Pricing</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
