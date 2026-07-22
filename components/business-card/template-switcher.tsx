"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useCardEditorStore } from "@/lib/business-card/store";
import { CardSideSchema } from "@/lib/business-card/schema";

interface TemplateSummary {
  slug: string;
  title: string;
  thumbnailFront: string | null;
}

/** Lets the user swap in a different template mid-edit, replacing the current front/back content.
 * Used both in the desktop left panel and the mobile "Templates" bottom sheet. */
export function TemplateSwitcher({ onSelected }: { onSelected?: () => void }) {
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState<string | null>(null);
  const resetToTemplate = useCardEditorStore((s) => s.resetToTemplate);
  const dirty = useCardEditorStore((s) => s.dirty);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/card-templates")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
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

  async function apply(slug: string) {
    const res = await fetch(`/api/card-templates/${slug}`);
    if (!res.ok) return;
    const data = await res.json();
    const front = CardSideSchema.parse(data.template.front);
    const back = CardSideSchema.parse(data.template.back);
    resetToTemplate(front, back, data.template.palette ?? null);
    setConfirmSlug(null);
    onSelected?.();
  }

  if (error) return <p className="text-sm text-kc-muted">Couldn&apos;t load templates right now.</p>;
  if (!templates) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[7/4.2] animate-pulse rounded-lg bg-kc-bg" />)}
      </div>
    );
  }

  return (
    <div>
      {confirmSlug && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="mb-2">Switching templates replaces everything on this card. Continue?</p>
            <div className="flex gap-2">
              <button onClick={() => apply(confirmSlug)} className="rounded-md bg-amber-800 px-3 py-1 font-semibold text-white">Replace</button>
              <button onClick={() => setConfirmSlug(null)} className="rounded-md border border-amber-300 px-3 py-1 font-semibold">Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {templates.map((t) => (
          <button
            key={t.slug}
            onClick={() => (dirty ? setConfirmSlug(t.slug) : apply(t.slug))}
            className="overflow-hidden rounded-lg border border-kc-border text-left hover:border-kc-teal/40"
          >
            <div className="aspect-[7/4.2] bg-kc-bg">
              {t.thumbnailFront ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.thumbnailFront} alt={t.title} className="h-full w-full object-cover" loading="lazy" />
              ) : null}
            </div>
            <div className="truncate p-1.5 text-[11px] font-medium text-kc-dark">{t.title}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
