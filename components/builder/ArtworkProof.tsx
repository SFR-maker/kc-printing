"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import type { ArtworkInspection } from "@/lib/business-card/inspect-artwork";

interface ArtworkProofProps {
  fileUrl: string;
  fileName: string;
  inspection: ArtworkInspection;
  approved: boolean;
  onApprovedChange: (approved: boolean) => void;
  onReplace: () => void;
}

/**
 * Shows the customer exactly what will be printed, with the three lines that matter drawn over it:
 *
 *   - the document edge (where the sheet ends)
 *   - the trim line (where the guillotine or die cuts)
 *   - the safe zone (0.125in inside trim, where content is guaranteed to survive)
 *
 * The artwork is drawn using the same cover-fit transform the print file will use, so this is a
 * true preview rather than a decorative thumbnail. Approving is gated on an explicit checkbox and
 * blocked outright when the file is too low-resolution to print acceptably.
 */
export function ArtworkProof({
  fileUrl,
  fileName,
  inspection,
  approved,
  onApprovedChange,
  onReplace,
}: ArtworkProofProps) {
  const blocking = inspection.warnings.find((w) => w.level === "block");
  const { requiredWidthIn, requiredHeightIn } = inspection;

  // Bleed and safe insets as a percentage of the document, so the overlay scales with the frame.
  const bleedIn = (requiredWidthIn - 3.5) / 2;
  const trimPctX = (bleedIn / requiredWidthIn) * 100;
  const trimPctY = (bleedIn / requiredHeightIn) * 100;
  const safePctX = ((bleedIn + 0.125) / requiredWidthIn) * 100;
  const safePctY = ((bleedIn + 0.125) / requiredHeightIn) * 100;

  // Cover-fit expressed as percentages of the document box.
  const artWidthPct = ((inspection.widthIn * inspection.fit.scale) / requiredWidthIn) * 100;
  const artHeightPct = ((inspection.heightIn * inspection.fit.scale) / requiredHeightIn) * 100;
  const artLeftPct = (inspection.fit.offsetXIn / requiredWidthIn) * 100;
  const artTopPct = (inspection.fit.offsetYIn / requiredHeightIn) * 100;

  return (
    <div className="space-y-5">
      <div className="edge overflow-hidden border border-kc-dark/12 bg-kc-paper p-5 sm:p-8">
        {/* Document box, at the true aspect of the required file */}
        <div
          className="relative mx-auto w-full max-w-xl bg-white shadow-[0_10px_36px_-12px_rgba(18,17,16,0.4)]"
          style={{ aspectRatio: `${requiredWidthIn} / ${requiredHeightIn}` }}
        >
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute"
              style={{
                left: `${artLeftPct}%`,
                top: `${artTopPct}%`,
                width: `${artWidthPct}%`,
                height: `${artHeightPct}%`,
              }}
            >
              {inspection.kind === "pdf" ? (
                <PdfPage url={fileUrl} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileUrl} alt={`Proof of ${fileName}`} className="h-full w-full object-fill" />
              )}
            </div>
          </div>

          {/* Trim line: where it gets cut */}
          <div
            className="pointer-events-none absolute border border-dashed border-kc-coral"
            style={{ left: `${trimPctX}%`, right: `${trimPctX}%`, top: `${trimPctY}%`, bottom: `${trimPctY}%` }}
            aria-hidden
          />
          {/* Safe zone: keep text inside this */}
          <div
            className="pointer-events-none absolute border border-dotted border-kc-teal/70"
            style={{ left: `${safePctX}%`, right: `${safePctX}%`, top: `${safePctY}%`, bottom: `${safePctY}%` }}
            aria-hidden
          />
        </div>

        <Legend />
      </div>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
        <Fact label="Your file">
          {inspection.widthIn} × {inspection.heightIn} in
        </Fact>
        <Fact label="Printed at">
          {requiredWidthIn} × {requiredHeightIn} in
        </Fact>
        <Fact label="Resolution">
          {inspection.kind === "pdf" ? "Vector" : `${inspection.effectiveDpi} DPI`}
        </Fact>
        <Fact label="Finished size">3.5 × 2 in</Fact>
      </dl>

      {inspection.warnings.length > 0 && (
        <ul className="space-y-2">
          {inspection.warnings.map((w) => (
            <li
              key={w.code}
              className={`edge flex items-start gap-2.5 border p-3.5 text-[14px] leading-snug ${
                w.level === "block"
                  ? "border-red-300 bg-red-50 text-red-800"
                  : w.level === "warn"
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-kc-dark/12 bg-white text-kc-dark/75"
              }`}
            >
              {w.level === "block" ? (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              ) : w.level === "warn" ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              ) : (
                <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              )}
              <span>{w.message}</span>
            </li>
          ))}
        </ul>
      )}

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
                I approve this proof for print. I understand the card is cut at the dashed line, that
                cutting can shift by up to 1/16 in, and that anything outside the dotted safe zone may
                be trimmed off.
              </span>
            </label>
            <button
              type="button"
              onClick={onReplace}
              className="mt-4 text-[13.5px] font-semibold text-kc-magenta-deep hover:text-kc-dark"
            >
              Upload a different file instead
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[12.5px] text-kc-dark/60">
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

/**
 * Renders page 1 of the PDF to a canvas with pdf.js.
 *
 * Loaded dynamically so the ~1MB library only ships to people who actually upload a PDF, and the
 * worker is pointed at the copy in node_modules rather than a CDN, which the site's CSP-free but
 * origin-locked asset setup requires.
 */
function PdfPage({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();

        const task = pdfjs.getDocument({ url });
        cleanup = () => void task.destroy();
        const doc = await task.promise;
        if (cancelled) return;

        const page = await doc.getPage(1);
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        // Render at 2x the laid-out width so the proof stays crisp on a retina display.
        const target = Math.min((canvas.parentElement?.clientWidth ?? 600) * 2, 2400);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: target / base.width });

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

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [url]);

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="h-full w-full" />
      {state !== "ready" && (
        <div className="absolute inset-0 flex items-center justify-center bg-white text-[13px] text-kc-dark/55">
          {state === "loading" ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Rendering your PDF
            </span>
          ) : (
            <span className="px-4 text-center">
              We couldn&apos;t render a preview of this PDF, but we did read its size. A designer will
              check it before print.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function ProofApprovedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-kc-sage">
      <CheckCircle2 className="h-4 w-4" strokeWidth={2} /> Proof approved
    </span>
  );
}
