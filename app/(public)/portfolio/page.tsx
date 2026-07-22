import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Design Portfolio",
  description:
    "See samples of KC Printing business card, postcard, and banner design work for clients in Kansas City, Dallas, and nationwide.",
};

const ITEMS = [
  { title: "Green Leaf Catering Cards", category: "Business Cards", tags: ["business-cards", "print"], description: "Elegant business card design with leaf motif and earth tones on ultra-thick 32pt stock." },
  { title: "KC Food Festival Banner", category: "Banners", tags: ["banner", "event"], description: "8x4 ft vinyl event banner for annual food festival in Kansas City. Vibrant colors, fast turnaround." },
  { title: "Bell Dental Patient Welcome", category: "Postcards", tags: ["postcards", "healthcare"], description: "6x9 EDDM postcard campaign for a dental group in Overland Park, KS. Friendly design with clear CTA." },
  { title: "Okafor Construction Roll-Up", category: "Banners", tags: ["banner", "construction"], description: "33x81 retractable roll-up banner for trade show display. Matched existing brand colors and added QR code." },
];

const CATEGORIES = ["All", "Business Cards", "Postcards", "Banners"];

export default function PortfolioPage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-kc-bg section-pad">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 -top-32 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-500/[0.07] blur-3xl" />
        </div>
        <div className="container-tight relative z-10 text-center">
          <Badge className="mb-4 border-kc-teal/20 bg-kc-teal/8 text-kc-teal">Portfolio</Badge>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-kc-dark sm:text-5xl">Work We Are Proud Of</h1>
          <p className="mx-auto max-w-xl text-lg text-kc-muted">
            Business cards, postcards, and banners for clients across Kansas City and nationwide.
          </p>
        </div>
      </section>

      <section className="section-pad bg-kc-bg">
        <div className="container-tight">
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className="text-sm px-4 py-1.5 rounded-full border border-kc-border bg-white text-kc-muted hover:border-kc-teal hover:text-kc-teal transition-colors"
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ITEMS.map((item) => (
              <div key={item.title} className="group bg-white rounded-xl border border-kc-border overflow-hidden hover:shadow-lg hover:border-kc-teal/30 transition-all duration-200">
                <div className="aspect-video bg-gradient-to-br from-kc-teal/20 via-kc-teal/10 to-kc-coral/10 flex items-center justify-center">
                  <span className="text-4xl opacity-40">
                    {item.category === "Business Cards" ? "🪪" :
                     item.category === "Banners" ? "🎯" : "📬"}
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="text-xs bg-kc-bg border-kc-border text-kc-muted">
                      {item.category}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-kc-dark mb-2 group-hover:text-kc-teal transition-colors">{item.title}</h3>
                  <p className="text-sm text-kc-muted leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-kc-muted mb-4">More samples available on request.</p>
            <Button asChild className="bg-kc-coral hover:bg-kc-coral/90 text-white">
              <Link href="/contact">Request Samples <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
