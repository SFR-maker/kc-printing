"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface PortfolioSample {
  slug: string;
  title: string;
  thumbnail: string;
  category: string;
  href: string;
}

const CATEGORIES = ["All", "Business Cards", "Postcards", "Banners", "Rigid Signs"];

export function PortfolioGrid({ samples }: { samples: PortfolioSample[] }) {
  const [active, setActive] = useState("All");
  const visible = active === "All" ? samples : samples.filter((s) => s.category === active);

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
        <p className="text-sm text-kc-muted">No examples in this category yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((item) => (
            <Link
              key={item.slug}
              href={item.href}
              className="group overflow-hidden rounded-md border border-kc-border bg-white transition-colors hover:border-kc-teal/40"
            >
              <div className="aspect-square overflow-hidden bg-kc-bg">
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                <h3 className="mb-1 text-sm font-bold text-kc-dark group-hover:text-kc-teal">{item.title}</h3>
                <p className="text-xs text-kc-muted">{item.category}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
