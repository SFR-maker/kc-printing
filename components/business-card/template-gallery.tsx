"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES } from "@/lib/business-card/templates/categories";
import { STYLE_TAGS } from "@/lib/business-card/templates/categories";

interface TemplateSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  industry: string;
  style: string;
  tags: string[];
  palette: string[];
  thumbnailFront: string | null;
  thumbnailBack: string | null;
}

const RECENT_KEY = "kc-card-recent-templates";

function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function TemplateGallery() {
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [industry, setIndustry] = useState("all");
  const [style, setStyle] = useState("all");
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    // localStorage isn't available during SSR, so this can only be read post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecent(getRecent());
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/card-templates")
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setTemplates(data.templates ?? []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!templates) return [];
    return templates.filter((t) => {
      if (industry !== "all" && t.industry !== industry) return false;
      if (style !== "all" && t.style !== style) return false;
      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        if (!t.title.toLowerCase().includes(needle) && !t.description.toLowerCase().includes(needle) && !t.tags.some((tag) => tag.includes(needle))) return false;
      }
      return true;
    });
  }, [templates, industry, style, q]);

  const recentTemplates = (templates ?? []).filter((t) => recent.includes(t.slug));

  if (error) {
    return (
      <div className="rounded-xl border border-dashed border-red-200 bg-red-50 py-16 text-center text-sm text-red-700">
        Couldn&apos;t load templates right now. <button onClick={() => window.location.reload()} className="font-semibold underline">Try again</button>, or{" "}
        <Link href="/services/business-cards/design/new" className="font-semibold underline">start from a blank card</Link>.
      </div>
    );
  }

  if (!templates) return <GallerySkeleton />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kc-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates..." className="pl-9" />
        </div>
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="rounded-md border border-kc-border bg-white px-3 py-2 text-sm">
          <option value="all">All Industries</option>
          {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <select value={style} onChange={(e) => setStyle(e.target.value)} className="rounded-md border border-kc-border bg-white px-3 py-2 text-sm">
          <option value="all">All Styles</option>
          {STYLE_TAGS.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      <Link
        href="/services/business-cards/design/new"
        className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-kc-teal/40 bg-kc-teal/5 px-6 py-5 text-sm font-semibold text-kc-teal transition-colors hover:bg-kc-teal/10"
      >
        <Sparkles className="h-4 w-4" /> Start From a Blank Card
      </Link>

      {recentTemplates.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-kc-dark">Recently Used</h2>
          <TemplateGrid templates={recentTemplates} />
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-kc-dark">{filtered.length} Template{filtered.length !== 1 ? "s" : ""}</h2>
        </div>
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-kc-border py-16 text-center text-sm text-kc-muted">
            No templates match your filters. Try a different search or category.
          </div>
        ) : (
          <TemplateGrid templates={filtered} />
        )}
      </section>
    </div>
  );
}

function TemplateGrid({ templates }: { templates: TemplateSummary[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {templates.map((t) => (
        <Link
          key={t.slug}
          href={`/services/business-cards/design/t-${t.slug}`}
          onClick={() => {
            const current = getRecent().filter((s) => s !== t.slug);
            window.localStorage.setItem(RECENT_KEY, JSON.stringify([t.slug, ...current].slice(0, 8)));
          }}
          className="group overflow-hidden rounded-xl border border-kc-border bg-white transition-shadow hover:shadow-lg"
        >
          <div className="aspect-[7/4.2] bg-kc-bg">
            {t.thumbnailFront ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.thumbnailFront} alt={t.title} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-kc-muted">Preview unavailable</div>
            )}
          </div>
          <div className="p-3">
            <h3 className="truncate text-sm font-semibold text-kc-dark group-hover:text-kc-teal">{t.title}</h3>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Badge variant="secondary" className="border-0 bg-kc-bg text-[10px] text-kc-muted">{t.style}</Badge>
              <div className="flex gap-1">
                {t.palette.slice(0, 3).map((c, i) => (
                  <span key={i} className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-[7/4.2] animate-pulse rounded-xl bg-kc-bg" />
      ))}
    </div>
  );
}
