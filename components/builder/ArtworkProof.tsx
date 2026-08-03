"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, Info, Loader2, XCircle, RotateCcw, RotateCw,
  Maximize2, Minimize2, Move, Scan,
} from "lucide-react";
import type { ArtworkInspection } from "@/lib/business-card/inspect-artwork";
import {
  type ArtworkPlacement, centred, coverScale, fitPlacement, guideLines,
  hasUncoveredEdge, originalPlacement, placedDpi, placedSize, snapPlacement,
} from "@/lib/business-card/placement";
import { MIN_PRINT_DPI, RECOMMENDED_DPI } from "@/lib/business-card/print-spec";
import { cn } from "@/lib/utils";

interface ArtworkProofProps {
  fileUrl: string;
  fileName: string;
  inspection: ArtworkInspection;
  placement: ArtworkPlacement;
  onPlacementChange: (next: ArtworkPlacement) => void;
  approved: boolean;
  onApprovedChange: (approved: boolean) => void;
  onReplace: () => void;
}

const MIN_SCALE = 0.05;
const MAX_SCALE = 20;

/**
 * Interactive proof: the customer positions their artwork on the print document and approves the
 * result, rather than being shown a fixed auto-fit and asked to accept it.
 *
 * Everything is computed in inches against the document and converted to percentages only at render
 * time, so the same placement drives the preview here and the print file later regardless of how
 * large the stage happens to be on screen.
 */
export function ArtworkProof({
  fileUrl, fileName, inspection, placement, onPlacementChange,
  approved, onApprovedChange, onReplace,
}: ArtworkProofProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [snapToGuides, setSnapToGuides] = useState(true);
  const [proportional, setProportional] = useState(true);
  const [dragging, setDragging] = useState(false);

  const { requiredWidthIn: docW, requiredHeightIn: docH } = inspection;
  const bleedIn = (docW - 3.5) / 2;
  const size = placedSize(inspection, placement);
  const dpi = placedDpi(inspection, placement);
  const uncovered = hasUncoveredEdge(inspection, placement);

  // Any change invalidates a previous approval: the customer approves a specific placement.
  const apply = useCallback(
    (next: ArtworkPlacement) => {
      onPlacementChange(next);
      if (approved) onApprovedChange(false);
    },
    [approved, onApprovedChange, onPlacementChange]
  );

  const pxPerInch = useCallback(() => {
    const rect = stageRef.current?.getBoundingClientRect();
    return rect ? rect.width / docW : 1;
  }, [docW]);

  function startDrag(e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = { ...placement };
    setDragging(true);

    const move = (ev: PointerEvent) => {
      const ppi = pxPerInch();
      const next: ArtworkPlacement = {
        ...origin,
        offsetXIn: origin.offsetXIn + (ev.clientX - startX) / ppi,
        offsetYIn: origin.offsetYIn + (ev.clientY - startY) / ppi,
      };
      apply(snapToGuides ? snapPlacement(inspection, next) : next);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  /** Corner handle: scales about the opposite corner so that corner stays put. */
  function startResize(e: React.PointerEvent, corner: "nw" | "ne" | "sw" | "se") {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = { ...placement };
    const originSize = placedSize(inspection, origin);
    const anchorX = corner === "nw" || corner === "sw" ? origin.offsetXIn + originSize.widthIn : origin.offsetXIn;
    const anchorY = corner === "nw" || corner === "ne" ? origin.offsetYIn + originSize.heightIn : origin.offsetYIn;
    const dirX = corner === "ne" || corner === "se" ? 1 : -1;
    const dirY = corner === "sw" || corner === "se" ? 1 : -1;

    const move = (ev: PointerEvent) => {
      const ppi = pxPerInch();
      const dW = ((ev.clientX - startX) / ppi) * dirX;
      const dH = ((ev.clientY - startY) / ppi) * dirY;
      // Proportional uses whichever axis the pointer moved furthest on, so dragging feels direct
      // rather than snapping to one axis.
      const ratio = proportional
        ? Math.abs(dW) > Math.abs(dH)
          ? (originSize.widthIn + dW) / originSize.widthIn
          : (originSize.heightIn + dH) / originSize.heightIn
        : (originSize.widthIn + dW) / originSize.widthIn;

      const scale = clamp(origin.scale * ratio, MIN_SCALE, MAX_SCALE);
      const nextSize = placedSize(inspection, { ...origin, scale });
      const next: ArtworkPlacement = {
        ...origin,
        scale,
        offsetXIn: dirX === 1 ? anchorX : anchorX - nextSize.widthIn,
        offsetYIn: dirY === 1 ? anchorY : anchorY - nextSize.heightIn,
      };
      apply(snapToGuides ? snapPlacement(inspection, next) : next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function rotate(dir: -1 | 1) {
    const next = (((placement.rotation + dir * 90) % 360) + 360) % 360 as ArtworkPlacement["rotation"];
    // Re-cover after turning, otherwise a quarter turn usually leaves the sheet partly bare.
    apply(centred(inspection, { ...placement, rotation: next, scale: coverScale(inspection, next) }));
  }

  const blocking = inspection.warnings.find((w) => w.level === "block");
  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  const guides = guideLines(inspection);

  return (
    <div className="space-y-5">
      <div className="edge border border-kc-dark/12 bg-kc-paper p-5 sm:p-8">
        <div className="mx-auto max-w-xl">
          {/* Width ruler */}
          <div className="mb-2 flex items-center gap-2 text-[11px] text-kc-dark/45">
            <span className="h-px flex-1 bg-kc-dark/20" />
            <span className="font-mono">{inspection.requiredWidthIn - bleedIn * 2} in</span>
            <span className="h-px flex-1 bg-kc-dark/20" />
          </div>

          <div className="flex gap-2">
            <div className="flex flex-col items-center justify-center gap-2 text-[11px] text-kc-dark/45">
              <span className="w-px flex-1 bg-kc-dark/20" />
              <span className="font-mono [writing-mode:vertical-rl]">
                {inspection.requiredHeightIn - bleedIn * 2} in
              </span>
              <span className="w-px flex-1 bg-kc-dark/20" />
            </div>

            <div
              ref={stageRef}
              className="relative flex-1 select-none overflow-hidden bg-white shadow-[0_10px_36px_-12px_rgba(18,17,16,0.4)]"
              style={{ aspectRatio: `${docW} / ${docH}`, touchAction: "none" }}
            >
              {/* Artwork */}
              <div
                onPointerDown={startDrag}
                className={cn("absolute", dragging ? "cursor-grabbing" : "cursor-grab")}
                style={{
                  left: pct(placement.offsetXIn, docW),
                  top: pct(placement.offsetYIn, docH),
                  width: pct(size.widthIn, docW),
                  height: pct(size.heightIn, docH),
                }}
              >
                <div
                  className="h-full w-full"
                  style={{
                    transform: `rotate(${placement.rotation}deg)`,
                    transformOrigin: "center",
                    // A quarter turn means the inner element's own box is the other way round.
                    ...(placement.rotation === 90 || placement.rotation === 270
                      ? { width: `${(size.heightIn / size.widthIn) * 100}%`, height: `${(size.widthIn / size.heightIn) * 100}%`, position: "absolute" as const, left: "50%", top: "50%", translate: "-50% -50%" }
                      : {}),
                  }}
                >
                  {inspection.kind === "pdf" ? (
                    <PdfPage url={fileUrl} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fileUrl} alt={`Proof of ${fileName}`} className="h-full w-full object-fill" draggable={false} />
                  )}
                </div>

                {[["nw", "-top-1.5 -left-1.5 cursor-nwse-resize"], ["ne", "-top-1.5 -right-1.5 cursor-nesw-resize"],
                  ["sw", "-bottom-1.5 -left-1.5 cursor-nesw-resize"], ["se", "-bottom-1.5 -right-1.5 cursor-nwse-resize"]].map(
                  ([corner, cls]) => (
                    <span
                      key={corner}
                      onPointerDown={(e) => startResize(e, corner as "nw" | "ne" | "sw" | "se")}
                      className={cn("absolute h-3 w-3 border border-white bg-kc-dark shadow-sm", cls)}
                    />
                  )
                )}
              </div>

              {/* Guides sit above the artwork so they stay readable while dragging */}
              {snapToGuides && dragging &&
                guides.x.map((g) => (
                  <span key={`gx${g}`} className="pointer-events-none absolute inset-y-0 w-px bg-kc-teal/25" style={{ left: pct(g, docW) }} />
                ))}
              {snapToGuides && dragging &&
                guides.y.map((g) => (
                  <span key={`gy${g}`} className="pointer-events-none absolute inset-x-0 h-px bg-kc-teal/25" style={{ top: pct(g, docH) }} />
                ))}

              <div
                className="pointer-events-none absolute border border-dashed border-kc-coral"
                style={{ left: pct(bleedIn, docW), right: pct(bleedIn, docW), top: pct(bleedIn, docH), bottom: pct(bleedIn, docH) }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute border border-dotted border-kc-teal/70"
                style={{ left: pct(bleedIn + 0.125, docW), right: pct(bleedIn + 0.125, docW), top: pct(bleedIn + 0.125, docH), bottom: pct(bleedIn + 0.125, docH) }}
                aria-hidden
              />
            </div>
          </div>

          <Legend />
        </div>
      </div>

      {/* Toolbar */}
      <div className="edge flex flex-wrap items-center gap-x-2 gap-y-3 border border-kc-dark/12 bg-white p-4">
        <Tool icon={<RotateCcw className="h-4 w-4" strokeWidth={1.75} />} label="Reset" onClick={() => apply(fitPlacement(inspection))} />
        <Tool icon={<Scan className="h-4 w-4" strokeWidth={1.75} />} label="Actual size" onClick={() => apply(originalPlacement(inspection, placement.rotation))} />
        <Tool icon={<Move className="h-4 w-4" strokeWidth={1.75} />} label="Centre" onClick={() => apply(centred(inspection, placement))} />
        <Tool icon={<Maximize2 className="h-4 w-4" strokeWidth={1.75} />} label="Fill sheet" onClick={() => apply(fitPlacement(inspection, placement.rotation))} />
        <Tool icon={<Minimize2 className="h-4 w-4" strokeWidth={1.75} />} label="Fit inside" onClick={() => {
          const turned = placement.rotation === 90 || placement.rotation === 270;
          const w = turned ? inspection.heightIn : inspection.widthIn;
          const h = turned ? inspection.widthIn : inspection.heightIn;
          apply(centred(inspection, { ...placement, scale: Math.min(docW / w, docH / h) }));
        }} />
        <Tool icon={<RotateCcw className="h-4 w-4" strokeWidth={1.75} />} label="Rotate left" onClick={() => rotate(-1)} />
        <Tool icon={<RotateCw className="h-4 w-4" strokeWidth={1.75} />} label="Rotate right" onClick={() => rotate(1)} />

        <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2">
          <Toggle checked={proportional} onChange={setProportional} label="Scale proportionally" />
          <Toggle checked={snapToGuides} onChange={setSnapToGuides} label="Snap to guides" />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
        <Fact label="Your file">{inspection.widthIn} × {inspection.heightIn} in</Fact>
        <Fact label="Placed at">{round2(size.widthIn)} × {round2(size.heightIn)} in</Fact>
        <Fact label="Resolution">{dpi ? `${dpi} DPI` : "Vector"}</Fact>
        <Fact label="Finished size">3.5 × 2 in</Fact>
      </dl>

      <Warnings inspection={inspection} dpi={dpi} uncovered={uncovered} />

      <div className="edge border border-kc-dark/12 bg-white p-5">
        {blocking ? (
          <p className="text-[14.5px] leading-relaxed text-kc-dark/70">
            This file can&apos;t be approved for print as it is.{" "}
            <button type="button" onClick={onReplace} className="font-semibold text-kc-magenta-deep hover:text-kc-dark">
              Upload a different file
            </button>{" "}
            and we&apos;ll re-check it.
          </p>
        ) : (
          <>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={approved}
                onChange={(e) => onApprovedChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-kc-coral"
              />
              <span className="text-[14.5px] leading-relaxed text-kc-dark">
                I approve this design for print. I understand the card is cut at the dashed line,
                that cutting can shift by up to 1/16 in, and that anything outside the dotted safe
                zone may be trimmed off.
              </span>
            </label>
            <button type="button" onClick={onReplace} className="mt-4 text-[13.5px] font-semibold text-kc-magenta-deep hover:text-kc-dark">
              Upload a different file instead
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Warnings({
  inspection, dpi, uncovered,
}: { inspection: ArtworkInspection; dpi: number | null; uncovered: boolean }) {
  const items: { level: "info" | "warn" | "block"; code: string; message: string }[] = [];

  if (uncovered) {
    items.push({
      level: "warn",
      code: "uncovered",
      message: "Part of the sheet isn't covered by your artwork. Those edges will print white. Drag a corner out to the solid edge, or use Fill sheet.",
    });
  }
  // Recomputed live rather than taken from the upload: scaling changes the effective resolution.
  if (dpi !== null && dpi < MIN_PRINT_DPI) {
    items.push({ level: "block", code: "dpi", message: `At this size your artwork works out to about ${dpi} DPI. Below ${MIN_PRINT_DPI} DPI it prints visibly soft. Scale it down, or upload a larger file.` });
  } else if (dpi !== null && dpi < RECOMMENDED_DPI) {
    items.push({ level: "warn", code: "dpi", message: `At this size your artwork is about ${dpi} DPI. ${RECOMMENDED_DPI} DPI is recommended for crisp small text.` });
  }
  for (const w of inspection.warnings) {
    if (w.code.startsWith("dpi")) continue;
    if (w.code === "aspect") continue;
    items.push(w);
  }

  if (!items.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((w) => (
        <li
          key={w.code}
          className={cn(
            "edge flex items-start gap-2.5 border p-3.5 text-[14px] leading-snug",
            w.level === "block" ? "border-red-300 bg-red-50 text-red-800"
              : w.level === "warn" ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-kc-dark/12 bg-white text-kc-dark/75"
          )}
        >
          {w.level === "block" ? <XCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
            : w.level === "warn" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              : <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />}
          <span>{w.message}</span>
        </li>
      ))}
    </ul>
  );
}

function Tool({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="edge flex flex-col items-center gap-1 border border-kc-dark/12 px-3 py-2 text-[11px] text-kc-dark/70 transition-colors hover:border-kc-dark/35 hover:text-kc-dark"
    >
      {icon}
      {label}
    </button>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13px] text-kc-dark/75">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-kc-coral" />
      {label}
    </label>
  );
}

function Legend() {
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[12.5px] text-kc-dark/60">
      <span className="flex items-center gap-2">
        <span className="inline-block h-0 w-5 border-t border-solid border-kc-dark/30" /> Document edge
      </span>
      <span className="flex items-center gap-2">
        <span className="inline-block h-0 w-5 border-t border-dashed border-kc-coral" /> Trim line, where it&apos;s cut
      </span>
      <span className="flex items-center gap-2">
        <span className="inline-block h-0 w-5 border-t border-dotted border-kc-teal/70" /> Safe zone, keep text inside
      </span>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[12.5px] text-kc-dark/50">{label}</dt>
      <dd className="mt-0.5 font-mono text-[13.5px] text-kc-dark">{children}</dd>
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Renders page 1 with pdf.js, loaded on demand so the library only ships to PDF uploaders. */
function PdfPage({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        const task = pdfjs.getDocument({ url });
        cleanup = () => void task.destroy();
        const doc = await task.promise;
        if (cancelled) return;
        const page = await doc.getPage(1);
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(2000 / base.width, 3) });
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        if (!cancelled) setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => { cancelled = true; cleanup?.(); };
  }, [url]);

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="h-full w-full" />
      {state !== "ready" && (
        <div className="absolute inset-0 flex items-center justify-center bg-white text-[13px] text-kc-dark/55">
          {state === "loading" ? (
            <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Rendering your PDF</span>
          ) : (
            <span className="px-4 text-center">We couldn&apos;t render a preview, but we did read its size. A designer will check it before print.</span>
          )}
        </div>
      )}
    </div>
  );
}
