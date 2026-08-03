"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

export interface PortfolioSample {
  slug: string;
  title: string;
  thumbnail: string;
  category: string;
  /** Human-readable industry, e.g. "Real Estate". Shown next to the category, not in the title. */
  industry: string | null;
  href: string;
}

const CATEGORIES = ["All", "Business Cards", "Postcards", "Banners", "Rigid Signs"] as const;

const EASE = [0.16, 1, 0.3, 1] as const;

const group: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.05 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export function PortfolioGrid({ samples }: { samples: PortfolioSample[] }) {
  const [active, setActive] = useState<string>("All");
  const reduce = useReducedMotion();

  const counts = useMemo(() => {
    const map = new Map<string, number>([["All", samples.length]]);
    for (const s of samples) map.set(s.category, (map.get(s.category) ?? 0) + 1);
    return map;
  }, [samples]);

  const visible = active === "All" ? samples : samples.filter((s) => s.category === active);

  return (
    <>
      {/* Segmented filter. Square trim to match the page's 2px shape system. */}
      <div
        role="group"
        aria-label="Filter examples by product"
        className="mb-10 flex flex-wrap gap-2"
      >
        {CATEGORIES.map((cat) => {
          const count = counts.get(cat) ?? 0;
          const selected = active === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActive(cat)}
              aria-pressed={selected}
              disabled={count === 0}
              className={cn(
                "edge border px-4 py-2 text-[13.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                selected
                  ? "border-kc-coral bg-kc-coral text-white"
                  : "border-kc-dark/15 bg-white text-kc-dark/70 hover:border-kc-dark/40 hover:text-kc-dark"
              )}
            >
              {cat}
              <span
                className={cn(
                  "ml-2 font-mono text-[11.5px]",
                  selected ? "text-white/70" : "text-kc-dark/40"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="edge border border-dashed border-kc-dark/20 bg-white px-6 py-16 text-center">
          <p className="text-[15px] text-kc-dark/60">
            No {active.toLowerCase()} examples are published yet.
          </p>
          <Link
            href="/contact"
            className="mt-3 inline-block text-[14px] font-semibold text-kc-magenta-deep hover:text-kc-dark"
          >
            Ask us for samples
          </Link>
        </div>
      ) : (
        <motion.ul
          // Re-keying on `active` replays the stagger, which reads as feedback that the filter applied.
          key={active}
          variants={group}
          initial={reduce ? false : "hidden"}
          animate="shown"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {visible.map((sample) => (
            <motion.li key={sample.slug} variants={item}>
              <Link
                href={sample.href}
                className="edge group flex h-full flex-col overflow-hidden border border-kc-dark/12 bg-white transition-colors hover:border-kc-dark/30"
              >
                {/* Mounted-proof frame. The square mount is the neutral one: business cards are 7:4
                    landscape, roll-up banners are roughly 1:2.5 portrait, rigid signs are square. The
                    old aspect-square + object-cover cropped every one of them.

                    The image is absolutely positioned so the frame's ratio is authoritative — with a
                    flex child, a tall banner thumbnail resolves its own height first and stretches
                    the box, which is what made the rows ragged. */}
                <div className="relative aspect-square bg-kc-paper">
                  <img
                    src={sample.thumbnail}
                    alt={sample.title}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-contain p-6 drop-shadow-[0_6px_14px_rgba(18,17,16,0.28)] transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                  />
                </div>
                <div className="border-t border-kc-dark/10 p-4">
                  <h3 className="line-clamp-2 min-h-[2.6em] text-[14px] font-semibold leading-snug text-kc-dark transition-colors group-hover:text-kc-magenta-deep">
                    {sample.title}
                  </h3>
                  <p className="mt-1 text-[12.5px] text-kc-dark/50">
                    {sample.industry ? `${sample.industry} · ${sample.category}` : sample.category}
                  </p>
                </div>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </>
  );
}
