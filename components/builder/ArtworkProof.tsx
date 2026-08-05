"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, Info, Loader2, XCircle, RotateCcw, RotateCw,
  Maximize2, Minimize2, Move, Scan,
} from "lucide-react";
import type { ArtworkInspection } from "@/lib/business-card/inspect-artwork";
import {
  type ArtworkPlacement, baseSize, centred, coverScale, fitPlacement, guideLines,
  hasUncoveredEdge, originalPlacement, placedDpi, placedSize, placementFromBox, snapPlacement,
} from "@/lib/business-card/placement";
import type { PrintSpec } from "@/lib/print/spec";
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
  /** Geometry and resolution floors for the product being printed. */
  spec: PrintSpec;
}

type Handle = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

/** Corners resize both axes; sides resize one. Sides are what make non-proportional scaling usable. */
const HANDLES: { id: Handle; cls: string }[] = [
  { id: "nw", cls: "h-3 w-3 -top-1.5 -left-1.5 cursor-nwse-resize" },
  { id: "ne", cls: "h-3 w-3 -top-1.5 -right-1.5 cursor-nesw-resize" },
  { id: "sw", cls: "h-3 w-3 -bottom-1.5 -left-1.5 cursor-nesw-resize" },
  { id: "se", cls: "h-3 w-3 -bottom-1.5 -right-1.5 cursor-nwse-resize" },
  { id: "n", cls: "h-2.5 w-6 -top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize" },
  { id: "s", cls: "h-2.5 w-6 -bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize" },
  { id: "w", cls: "h-6 w-2.5 -left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize" },
  { id: "e", cls: "h-6 w-2.5 -right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize" },
];

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
  approved, onApprovedChange, onReplace, spec,
}: ArtworkProofProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [snapToGuides, setSnapToGuides] = useState(true);
  const [proportional, setProportional] = useState(true);
  const [dragging, setDragging] = useState(false);

  const { requiredWidthIn: docW, requiredHeightIn: docH } = inspection;
  // From the spec. Deriving it as (docW - 3.5) / 2 hardcoded the business card's trim width and
  // drew the trim and safe-zone rectangles in the wrong place on every other product.
  const bleedIn = spec.bleedIn;
  const size = placedSize(inspection, placement);
  const dpi = placedDpi(inspection, placement);
  const uncovered = hasUncoveredEdge(inspection, placement);
  // Non-proportional resizing distorts the artwork. Legitimate sometimes, a mistake often, so say so.
  const stretch = placement.scaleX / placement.scaleY;
  const distorted = Math.abs(stretch - 1) > 0.005;

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
      apply(snapToGuides ? snapPlacement(inspection, next, spec) : next);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  /**
   * Resize from any of the eight handles.
   *
   * Edges that the handle does not touch stay exactly where they are, so dragging the right side
   * never moves the left one. With "scale proportionally" on, the axis you dragged furthest sets a
   * ratio applied to both, and the untouched axis grows about its own centre so the artwork does
   * not drift sideways while you resize it vertically.
   */
  function startResize(e: React.PointerEvent, handle: Handle) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = { ...placement };
    const o = placedSize(inspection, origin);
    const box0 = { x: origin.offsetXIn, y: origin.offsetYIn, width: o.widthIn, height: o.heightIn };
    const base = baseSize(inspection, origin.rotation);

    const movesLeft = handle.includes("w");
    const movesRight = handle.includes("e");
    const movesTop = handle.includes("n");
    const movesBottom = handle.includes("s");

    const move = (ev: PointerEvent) => {
      const ppi = pxPerInch();
      const dx = (ev.clientX - startX) / ppi;
      const dy = (ev.clientY - startY) / ppi;

      let width = box0.width + (movesRight ? dx : 0) - (movesLeft ? dx : 0);
      let height = box0.height + (movesBottom ? dy : 0) - (movesTop ? dy : 0);

      if (proportional) {
        // Use whichever axis this handle actually drives; for a corner, whichever moved more.
        const drivesX = movesLeft || movesRight;
        const drivesY = movesTop || movesBottom;
        const ratioX = width / box0.width;
        const ratioY = height / box0.height;
        const ratio =
          drivesX && drivesY ? (Math.abs(dx) > Math.abs(dy) ? ratioX : ratioY) : drivesX ? ratioX : ratioY;
        width = box0.width * ratio;
        height = box0.height * ratio;
      }

      const minW = base.widthIn * MIN_SCALE;
      const minH = base.heightIn * MIN_SCALE;
      width = clamp(width, minW, base.widthIn * MAX_SCALE);
      height = clamp(height, minH, base.heightIn * MAX_SCALE);

      // Anchor the edges the handle isn't dragging.
      const x = movesLeft ? box0.x + box0.width - width : proportional && !movesRight ? box0.x + (box0.width - width) / 2 : box0.x;
      const y = movesTop ? box0.y + box0.height - height : proportional && !movesBottom ? box0.y + (box0.height - height) / 2 : box0.y;

      const next = placementFromBox(inspection, origin.rotation, { x, y, width, height });
      apply(snapToGuides ? snapPlacement(inspection, next, spec) : next);
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
    const scale = coverScale(inspection, next);
    apply(centred(inspection, { ...placement, rotation: next, scaleX: scale, scaleY: scale }));
  }

  const blocking = inspection.warnings.find((w) => w.level === "block");
  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  const guides = guideLines(inspection, spec);

  return (
    <div className="space-y-5">
      <div className="edge border border-kc-dark/12 bg-kc-paper p-5 sm:p-8">
        <div className="mx-auto max-w-xl">
          {/* Width ruler */}
          <div className="mb-2 flex items-center gap-2 text-[11.77px] text-kc-dark/60">
            <span className="h-px flex-1 bg-kc-dark/20" />
            <span className="font-mono">{inspection.requiredWidthIn - bleedIn * 2} in</span>
            <span className="h-px flex-1 bg-kc-dark/20" />
          </div>

          <div className="flex gap-2">
            <div className="flex flex-col items-center justify-center gap-2 text-[11.77px] text-kc-dark/60">
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

                {HANDLES.map(({ id, cls }) => (
                  <span
                    key={id}
                    onPointerDown={(e) => startResize(e, id)}
                    className={cn("absolute border border-white bg-kc-dark shadow-sm", cls)}
                  />
                ))}
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
          const base = baseSize(inspection, placement.rotation);
          const scale = Math.min(docW / base.widthIn, docH / base.heightIn);
          apply(centred(inspection, { ...placement, scaleX: scale, scaleY: scale }));
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
        <Fact label="Placed at">
          {round2(size.widthIn)} × {round2(size.heightIn)} in
          {distorted && <span className="ml-1.5 text-kc-magenta-deep">stretched</span>}
        </Fact>
        <Fact label="Resolution">{dpi ? `${dpi} DPI` : "Vector"}</Fact>
        <Fact label="Finished size">{spec.trimWidthIn} × {spec.trimHeightIn} in</Fact>
      </dl>

      <Warnings inspection={inspection} dpi={dpi} uncovered={uncovered} distorted={distorted} spec={spec} />

      <div className="edge border border-kc-dark/12 bg-white p-5">
        {blocking ? (
          <p className="text-[15.52px] leading-relaxed text-kc-dark/70">
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
              <span className="text-[15.52px] leading-relaxed text-kc-dark">
                I approve this design for print. I understand it is cut at the dashed line,
                that cutting can shift by up to 1/16 in, and that anything outside the dotted safe
                zone may be trimmed off.
              </span>
            </label>
            <button type="button" onClick={onReplace} className="mt-4 text-[14.45px] font-semibold text-kc-magenta-deep hover:text-kc-dark">
              Upload a different file instead
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Warnings({
  inspection, dpi, uncovered, distorted, spec,
}: { inspection: ArtworkInspection; dpi: number | null; uncovered: boolean; distorted: boolean; spec: PrintSpec }) {
  const items: { level: "info" | "warn" | "block"; code: string; message: string }[] = [];

  if (uncovered) {
    items.push({
      level: "warn",
      code: "uncovered",
      message: "Part of the sheet isn't covered by your artwork. Those edges will print white. Drag a corner out to the solid edge, or use Fill sheet.",
    });
  }
  if (distorted) {
    items.push({
      level: "warn",
      code: "distorted",
      message: "Your artwork is no longer in its original proportions, so circles, logos and type will print squashed or stretched. Turn on Scale proportionally and use Reset if that wasn't deliberate.",
    });
  }
  // Recomputed live rather than taken from the upload: scaling changes the effective resolution.
  if (dpi !== null && dpi < spec.minDpi) {
    items.push({ level: "block", code: "dpi", message: `At this size your artwork works out to about ${dpi} DPI. Below ${spec.minDpi} DPI it prints visibly soft. Scale it down, or upload a larger file.` });
  } else if (dpi !== null && dpi < spec.recommendedDpi) {
    items.push({ level: "warn", code: "dpi", message: `At this size your artwork is about ${dpi} DPI. ${spec.recommendedDpi} DPI is recommended.` });
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
            "edge flex items-start gap-2.5 border p-3.5 text-[14.98px] leading-snug",
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
      className="edge flex flex-col items-center gap-1 border border-kc-dark/12 px-3 py-2 text-[11.77px] text-kc-dark/70 transition-colors hover:border-kc-dark/35 hover:text-kc-dark"
    >
      {icon}
      {label}
    </button>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13.91px] text-kc-dark/75">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-kc-coral" />
      {label}
    </label>
  );
}

function Legend() {
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13.38px] text-kc-dark/60">
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
      <dt className="text-[13.38px] text-kc-dark/60">{label}</dt>
      <dd className="mt-0.5 font-mono text-[14.45px] text-kc-dark">{children}</dd>
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
        <div className="absolute inset-0 flex items-center justify-center bg-white text-[13.91px] text-kc-dark/60">
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
