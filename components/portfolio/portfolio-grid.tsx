"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

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

export function PortfolioGrid() {
  const [active, setActive] = useState("All");
  const visible = active === "All" ? STYLE_SAMPLES : STYLE_SAMPLES.filter((s) => s.category === active);

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActive(cat)}
            aria-pressed={active === cat}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition-colors",
              active === cat
                ? "border-kc-teal bg-kc-teal text-white"
                : "border-kc-border bg-white text-kc-muted hover:border-kc-teal hover:text-kc-teal"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-kc-muted">No samples in this category yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((item) => (
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
      )}
    </>
  );
}
