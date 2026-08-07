"use client";

import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { useCardEditorStore } from "@/lib/business-card/store";

/**
 * Zoom controls, on the canvas where they are needed.
 *
 * They were three taps deep in the kebab menu, which on a banner meant being unable to work: the
 * fitted view of a 4 x 12ft banner is about 1%, so anything smaller than a headline is untouchable
 * until you zoom, and nothing on screen said zooming was possible.
 *
 * Pinch works too (see CardCanvas), but a visible control is what tells someone the canvas zooms at
 * all - and it is the only option for anyone who cannot make a two-finger gesture.
 */
export function MobileZoomPill() {
  const zoom = useCardEditorStore((s) => s.zoom);
  const setZoom = useCardEditorStore((s) => s.setZoom);
  const requestFit = useCardEditorStore((s) => s.requestFit);

  // Multiplied, not added: a flat step is a nudge at 100% and nonsense at 1%.
  const STEP = 1.25;

  /** Below 10% two decimals are noise; above it, whole numbers read better. */
  const label = zoom < 0.1 ? `${(zoom * 100).toFixed(1)}%` : `${Math.round(zoom * 100)}%`;

  return (
    <div className="pointer-events-auto absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full border border-kc-border bg-white/95 px-1.5 py-1 shadow-lg backdrop-blur">
      <button
        type="button"
        aria-label="Zoom out"
        onClick={() => setZoom(zoom / STEP)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-kc-dark active:bg-kc-bg"
      >
        <ZoomOut className="h-4 w-4" strokeWidth={1.75} />
      </button>

      <button
        type="button"
        onClick={() => requestFit()}
        className="min-w-[4.5rem] rounded-full px-2 text-center text-xs font-semibold tabular-nums text-kc-dark active:bg-kc-bg"
        aria-label={`Zoom ${label}. Tap to fit to screen.`}
      >
        {label}
      </button>

      <button
        type="button"
        aria-label="Zoom in"
        onClick={() => setZoom(zoom * STEP)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-kc-dark active:bg-kc-bg"
      >
        <ZoomIn className="h-4 w-4" strokeWidth={1.75} />
      </button>

      <span className="mx-0.5 h-5 w-px bg-kc-border" aria-hidden />

      <button
        type="button"
        aria-label="Fit to screen"
        onClick={() => requestFit()}
        className="flex h-9 w-9 items-center justify-center rounded-full text-kc-dark active:bg-kc-bg"
      >
        <Maximize2 className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
