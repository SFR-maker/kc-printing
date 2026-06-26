import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Design Portfolio",
  description:
    "See samples of KC Printing business card, logo, postcard, banner, and website design work for clients in Kansas City, Dallas, and nationwide.",
};

const ITEMS = [
  { title: "Riverside Auto Repair Rebrand", category: "Logo Design", tags: ["logo", "branding"], description: "Complete logo and brand identity for a Kansas City auto repair shop. Bold, industrial feel with navy and orange." },
  { title: "Green Leaf Catering Cards", category: "Business Cards", tags: ["business-cards", "print"], description: "Elegant business card design with leaf motif and earth tones on ultra-thick 32pt stock." },
  { title: "Plano Real Estate Group", category: "Website Design", tags: ["web", "real-estate"], description: "5-page business website with lead capture and property listing layout for a Plano, TX real estate group." },
  { title: "KC Food Festival Banner", category: "Vinyl Banners", tags: ["banner", "event"], description: "8x4 ft event banner for annual food festival in Kansas City. Vibrant colors, fast turnaround." },
  { title: "Bell Dental Patient Welcome", category: "Postcards", tags: ["postcards", "healthcare"], description: "6x9 EDDM postcard campaign for a dental group in Overland Park, KS. Friendly design with clear CTA." },
  { title: "Okafor Construction Roll-Up", category: "Roll-Up Banners", tags: ["banner", "construction"], description: "33x81 retractable banner for trade show display. Matched existing brand colors and added QR code." },
];

const CATEGORIES = ["All", "Logo Design", "Business Cards", "Website Design", "Vinyl Banners", "Postcards", "Roll-Up Banners"];

export default function PortfolioPage() {
  return (
    <div>
      <section className="bg-kc-dark text-white section-pad">
        <div className="container-tight text-center">
          <Badge className="mb-4 bg-kc-coral/20 text-kc-coral border-kc-coral/30 hover:bg-kc-coral/20">Portfolio</Badge>
          <h1 className="text-4xl sm:text-5xl font-black mb-4">Work We Are Proud Of</h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            Business cards, logos, postcards, banners, and websites for clients across Kansas City and nationwide.
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
                    {item.category === "Logo Design" ? "✦" :
                     item.category === "Business Cards" ? "🪪" :
                     item.category === "Website Design" ? "🌐" :
                     item.category.includes("Banner") ? "🎯" : "📬"}
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
