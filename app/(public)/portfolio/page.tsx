import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Design Portfolio",
  description:
    "Sample styles for KC Printing business card, postcard, and banner design work — Kansas City and nationwide.",
};

// Style examples, not specific past client work — no completed-project photography exists yet for
// this site. Labeled by style rather than attached to a company name so nothing here implies a
// real client relationship that doesn't exist. Replace with real project photos as they're shot.
const STYLE_SAMPLES = [
  { title: "Earth-tone & botanical", category: "Business Cards", accent: "bg-kc-teal", description: "Warm, natural palette on ultra-thick 32pt stock — a common request from food, wellness, and garden businesses." },
  { title: "Bold single-color block", category: "Banners", accent: "bg-kc-coral", description: "High-contrast vinyl banner style built to be readable from across a room at a trade show or festival." },
  { title: "Friendly & approachable", category: "Postcards", accent: "bg-kc-yellow", description: "Rounded corners and a clear call to action — a good fit for EDDM mailers and appointment reminders." },
  { title: "Clean corporate", category: "Banners", accent: "bg-kc-teal", description: "Minimal roll-up stand layout with a matched business card set, built for trade shows and office lobbies." },
];

const CATEGORIES = ["All", "Business Cards", "Postcards", "Banners"];

export default function PortfolioPage() {
  return (
    <div>
      <div className="section-pad-tight bg-kc-bg">
        <div className="container-tight max-w-2xl">
          <h1 className="mb-3 text-4xl font-black tracking-tight text-kc-dark sm:text-5xl">Style samples</h1>
          <p className="text-lg text-kc-muted">
            A few of the directions we design in. Every project is built from scratch for the business ordering it — nothing here is a template.
          </p>
        </div>
      </div>

      <div className="container-tight px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className="rounded-full border border-kc-border bg-white px-4 py-1.5 text-sm text-kc-muted transition-colors hover:border-kc-teal hover:text-kc-teal"
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STYLE_SAMPLES.map((item) => (
            <div key={item.title} className="overflow-hidden rounded-md border border-kc-border bg-white">
              <div className={`flex aspect-[4/3] items-center justify-center ${item.accent}`}>
                <span className="text-xs font-bold uppercase tracking-widest text-white/70">{item.category}</span>
              </div>
              <div className="p-4">
                <h3 className="mb-1.5 text-sm font-bold text-kc-dark">{item.title}</h3>
                <p className="text-xs leading-relaxed text-kc-muted">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-6 rounded-md border border-kc-border bg-kc-violet-tint p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="mb-1.5 text-xl font-bold text-kc-dark">Want to see real project files?</h2>
            <p className="text-sm text-kc-muted">Ask and we&apos;ll share examples relevant to your industry.</p>
          </div>
          <Button asChild className="shrink-0 rounded-md bg-kc-coral text-white hover:bg-kc-coral/90">
            <Link href="/contact">Request Samples <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
