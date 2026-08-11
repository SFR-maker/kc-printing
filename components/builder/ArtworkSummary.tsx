"use client";

import { useState } from "react";
import { Pencil, RefreshCw, Sparkles, Trash2, Upload, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * What the "Your Artwork" section becomes once artwork actually exists.
 *
 * Until now that section stayed a fork - "upload a file" or "have us design it" - even after the
 * customer had chosen a template, generated an AI design or uploaded a file. So the page kept asking
 * a question it already had the answer to, and there was no single place showing what would print.
 *
 * Once there is artwork this replaces the fork with a summary: what was chosen, what it looks like
 * on each face, and the three things anyone actually wants to do next.
 */

export type ArtworkSource = "AI" | "TEMPLATE" | "STUDIO" | "UPLOAD" | "DESIGN_SERVICE";

const SOURCE_LABEL: Record<ArtworkSource, string> = {
  AI: "AI design selected",
  TEMPLATE: "Template selected",
  STUDIO: "Your design",
  UPLOAD: "Uploaded artwork",
  DESIGN_SERVICE: "Our designers are making this",
};

const SOURCE_ICON: Record<ArtworkSource, typeof Sparkles> = {
  AI: Sparkles,
  TEMPLATE: LayoutTemplate,
  STUDIO: Pencil,
  UPLOAD: Upload,
  DESIGN_SERVICE: Pencil,
};

export interface ArtworkFace {
  label: string;
  /** Rendered SVG for a studio/AI/template design. */
  svg?: string | null;
  /** Bitmap for an uploaded file. */
  imageUrl?: string | null;
  /** Shown when the face exists but has nothing on it, so an empty box is never unexplained. */
  emptyNote?: string;
}

export interface ArtworkSummaryProps {
  source: ArtworkSource;
  /** Template or design name, when there is one worth showing. */
  title?: string | null;
  faces: ArtworkFace[];
  /** Reassurance under the previews: the size and finish this is print-ready at. */
  specNote?: string;
  onEdit?: () => void;
  onReplace?: () => void;
  /**
   * Removing artwork is destructive and cannot be undone from here, so it always confirms first -
   * a customer who has spent ten minutes in the editor should not lose it to a mis-tap.
   */
  onRemove?: () => void;
  removeWarning?: string;
  editLabel?: string;
}

export function ArtworkSummary({
  source, title, faces, specNote, onEdit, onReplace, onRemove, removeWarning, editLabel,
}: ArtworkSummaryProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const Icon = SOURCE_ICON[source];

  return (
    <div className="rounded-xl border-2 border-kc-teal/40 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kc-teal/10 text-kc-teal">
            <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </span>
          <div>
            <div className="text-[15px] font-semibold text-kc-dark">{SOURCE_LABEL[source]}</div>
            {title && <div className="text-[13px] text-kc-muted">{title}</div>}
          </div>
        </div>
      </div>

      <div className={faces.length > 1 ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : ""}>
        {faces.map((face) => (
          <figure key={face.label} className="overflow-hidden rounded-lg border border-kc-border bg-kc-bg">
            <figcaption className="border-b border-kc-border px-3 py-1.5 text-xs font-semibold text-kc-muted">
              {face.label}
            </figcaption>
            {face.svg ? (
              <div
                className="bg-white [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: face.svg }}
              />
            ) : face.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={face.imageUrl} alt={`${face.label} artwork`} className="block h-auto w-full bg-white" loading="lazy" />
            ) : (
              <div className="px-3 py-10 text-center text-xs text-kc-muted">
                {face.emptyNote ?? "Nothing on this side"}
              </div>
            )}
          </figure>
        ))}
      </div>

      {specNote && <p className="mt-4 text-[13.5px] text-kc-muted">{specNote}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-kc-border pt-4">
        {onEdit && (
          <Button variant="outline" onClick={onEdit} className="h-9 border-kc-border text-[14px] font-semibold text-kc-dark">
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> {editLabel ?? "Edit design"}
          </Button>
        )}
        {onReplace && (
          <Button variant="outline" onClick={onReplace} className="h-9 border-kc-border text-[14px] font-semibold text-kc-dark">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Replace
          </Button>
        )}
        {onRemove && !confirmingRemove && (
          <Button
            variant="outline"
            onClick={() => setConfirmingRemove(true)}
            className="ml-auto h-9 border-kc-border text-[14px] text-kc-muted hover:text-kc-dark"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
          </Button>
        )}
      </div>

      {/*
        Inline confirmation rather than window.confirm: a native dialog is unstyled, unreadable on a
        phone, and gives no room to say what is actually about to be lost.
      */}
      {confirmingRemove && onRemove && (
        <div role="alertdialog" aria-label="Remove artwork" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-[13.5px] leading-snug text-amber-900">
            {removeWarning ?? "This removes the artwork from your order. You'll be asked to upload a file or start a design again."}
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              onClick={() => { setConfirmingRemove(false); onRemove(); }}
              className="h-9 bg-amber-700 text-[14px] font-semibold text-white hover:bg-amber-800"
            >
              Yes, remove it
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmingRemove(false)}
              className="h-9 border-amber-300 bg-white text-[14px] text-amber-900"
            >
              Keep it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
