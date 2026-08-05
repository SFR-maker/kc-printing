"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, PenLine, FileCheck2, Check } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing-client";
import { docSize, type PrintSpec } from "@/lib/print/spec";
import type { ArtworkInspection } from "@/lib/business-card/inspect-artwork";
import { fitPlacement, type ArtworkPlacement } from "@/lib/business-card/placement";
import { ArtworkProof } from "@/components/builder/ArtworkProof";
import { cn } from "@/lib/utils";

export type ArtworkPath = "UPLOAD" | "DESIGN_SERVICE";

/** One printed face. A double-sided card needs two, each proofed and approved separately. */
export interface ArtworkSide {
  fileUrl: string | null;
  fileName: string | null;
  inspection: ArtworkInspection | null;
  /** Where the customer positioned this face. Null until a file has been inspected. */
  placement: ArtworkPlacement | null;
  approved: boolean;
}

export interface ArtworkState {
  path: ArtworkPath | null;
  front: ArtworkSide;
  back: ArtworkSide;
}

export const EMPTY_SIDE: ArtworkSide = {
  fileUrl: null,
  fileName: null,
  inspection: null,
  placement: null,
  approved: false,
};

export const EMPTY_ARTWORK: ArtworkState = {
  path: null,
  front: { ...EMPTY_SIDE },
  back: { ...EMPTY_SIDE },
};

/**
 * Brings a saved draft up to the current shape.
 *
 * Artwork used to be one flat set of fields, because only the front was ever uploaded. Drafts live
 * in sessionStorage and outlive a deploy, so a returning customer would otherwise land on a state
 * with no `front` at all and crash the step. Legacy fields become the front, which is what they were.
 */
export function normaliseArtwork(value: unknown): ArtworkState {
  if (!value || typeof value !== "object") return { ...EMPTY_ARTWORK };
  const v = value as Record<string, unknown>;
  if (v.front && typeof v.front === "object") {
    return {
      path: (v.path as ArtworkPath | null) ?? null,
      front: { ...EMPTY_SIDE, ...(v.front as object) },
      back: { ...EMPTY_SIDE, ...((v.back as object) ?? {}) },
    };
  }
  return {
    path: (v.path as ArtworkPath | null) ?? null,
    front: {
      fileUrl: (v.fileUrl as string | null) ?? null,
      fileName: (v.fileName as string | null) ?? null,
      inspection: (v.inspection as ArtworkInspection | null) ?? null,
      placement: (v.placement as ArtworkPlacement | null) ?? null,
      approved: Boolean(v.approved),
    },
    back: { ...EMPTY_SIDE },
  };
}

/** A face is done when a file has been measured, positioned and approved. */
export function sideComplete(side: ArtworkSide): boolean {
  return Boolean(side.fileUrl && side.inspection && side.placement && side.approved);
}

/**
 * True when the customer can move on: either our designers are doing the work, or every face that
 * will actually be printed has an approved proof.
 *
 * `needsBack` comes from the chosen print option, not from whether a back file happens to exist - a
 * single-sided order with a stray back upload is still complete, and a double-sided one without a
 * back is not.
 */
export function artworkComplete(a: ArtworkState, needsBack: boolean): boolean {
  if (a.path === "DESIGN_SERVICE") return true;
  if (a.path !== "UPLOAD") return false;
  return sideComplete(a.front) && (!needsBack || sideComplete(a.back));
}

export function ArtworkStep({
  value,
  onChange,
  roundCorners,
  needsBack,
  backLabel,
  spec,
}: {
  value: ArtworkState;
  onChange: (next: ArtworkState) => void;
  /** Only meaningful for business cards, where the corner finish changes the bleed. */
  roundCorners: boolean;
  /** Set when the chosen print option puts something on the reverse. */
  needsBack: boolean;
  /** "Back (full colour)" or "Back (grayscale)", so the right file gets supplied. */
  backLabel: string;
  /**
   * Geometry and resolution floors for whatever is being printed.
   *
   * Passed in rather than built here: a banner is 0.125in bleed at 150 DPI, and a step that
   * assumed a business card would ask a banner customer for a 3.6 x 2.1in file.
   */
  spec: PrintSpec;
}) {
  const doc = docSize(spec);
  const setSide = (which: "front" | "back", side: ArtworkSide) => onChange({ ...value, [which]: side });

  if (value.path === "UPLOAD") {
    return (
      <div className="space-y-7">
        <SideUploader
          heading={needsBack ? "Front" : "Your artwork"}
          side={value.front}
          onChange={(s) => setSide("front", s)}
          roundCorners={roundCorners}
          spec={spec}
        />

        {needsBack && (
          <>
            <div className="border-t border-kc-dark/10" />
            <SideUploader
              heading={backLabel}
              side={value.back}
              onChange={(s) => setSide("back", s)}
              roundCorners={roundCorners}
              spec={spec}
            />
            <p className="text-[14.45px] leading-relaxed text-kc-dark/60">
              Each face needs its own file and its own approval. The back prints on the same sheet, so
              it uses the same {doc.widthIn} × {doc.heightIn} in document as the front.
            </p>
          </>
        )}

        <button
          type="button"
          onClick={() => onChange({ ...EMPTY_ARTWORK })}
          className="text-[14.45px] font-semibold text-kc-magenta-deep hover:text-kc-dark"
        >
          Start over, or have us design it instead
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Choice
        selected={false}
        icon={<Upload className="h-5 w-5" strokeWidth={1.75} />}
        title="I have my own design"
        body={
          needsBack
            ? `Upload a print-ready file for each side at ${doc.widthIn} × ${doc.heightIn} in. We'll proof both for you to approve.`
            : `Upload a print-ready file at ${doc.widthIn} × ${doc.heightIn} in. We'll show you a proof to approve.`
        }
        onClick={() => onChange({ ...EMPTY_ARTWORK, path: "UPLOAD" })}
      />
      <Choice
        selected={value.path === "DESIGN_SERVICE"}
        icon={<PenLine className="h-5 w-5" strokeWidth={1.75} />}
        title="Design it for me"
        body="Tell us about your business and a real designer builds the layout. First draft in 1 to 3 business days."
        onClick={() => onChange({ ...EMPTY_ARTWORK, path: "DESIGN_SERVICE" })}
      />
    </div>
  );
}

/**
 * Upload, inspect and proof one face.
 *
 * Each side owns its upload state so a failure on the back never disturbs an approved front -
 * throwing away an approval the customer already gave is worse than making them retry an upload.
 */
function SideUploader({
  heading,
  side,
  onChange,
  roundCorners,
  spec,
}: {
  heading: string;
  side: ArtworkSide;
  onChange: (next: ArtworkSide) => void;
  roundCorners: boolean;
  spec: PrintSpec;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"idle" | "uploading" | "inspecting">("idle");
  const [error, setError] = useState<string | null>(null);
  const doc = docSize(spec);

  const { startUpload } = useUploadThing("brandFile", {
    onUploadError: (e) =>
      setError(
        e.message.includes("FileSizeMismatch")
          ? "That file is too large (32MB max)."
          : "Upload failed. Please try again."
      ),
  });

  async function handleFile(file: File) {
    setError(null);
    setBusy("uploading");
    try {
      const uploaded = await startUpload([file]);
      const first = uploaded?.[0];
      if (!first) throw new Error("upload-failed");

      setBusy("inspecting");
      const res = await fetch("/api/artwork/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: first.url, fileName: first.name, roundCorners }),
      });
      const payload = await res.json();

      if (!res.ok) {
        setError(payload?.error ?? "We couldn't read that file. Please try another.");
        setBusy("idle");
        return;
      }

      const inspection = payload as ArtworkInspection;
      onChange({
        fileUrl: first.url,
        fileName: first.name,
        inspection,
        // Opens on the auto-fit, which covers the sheet. The customer can move it from there.
        placement: fitPlacement(inspection),
        approved: false,
      });
    } catch {
      setError("Something went wrong uploading that file. Please try again.");
    } finally {
      setBusy("idle");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[16.05px] font-bold text-kc-dark">{heading}</h3>
        {sideComplete(side) && (
          <span className="inline-flex items-center gap-1 text-[13.91px] font-semibold text-emerald-700">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> Approved
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      {side.inspection && side.fileUrl && side.fileName && side.placement ? (
        <>
          <div className="flex items-center gap-2 text-[14.98px] text-kc-dark/70">
            <FileCheck2 className="h-4 w-4 text-kc-coral" strokeWidth={1.75} />
            <span className="truncate font-medium text-kc-dark">{side.fileName}</span>
          </div>
          <ArtworkProof
            fileUrl={side.fileUrl}
            fileName={side.fileName}
            inspection={side.inspection}
            placement={side.placement}
            onPlacementChange={(placement) => onChange({ ...side, placement })}
            approved={side.approved}
            onApprovedChange={(approved) => onChange({ ...side, approved })}
            spec={spec}
            onReplace={() => {
              onChange({ ...EMPTY_SIDE });
              setError(null);
            }}
          />
        </>
      ) : (
        <div className="edge border border-kc-dark/12 bg-white p-5">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-[14.45px] sm:grid-cols-3">
            <SpecFact label="Upload at">
              {doc.widthIn} × {doc.heightIn} in
            </SpecFact>
            <SpecFact label="Cuts to">
              {spec.trimWidthIn} × {spec.trimHeightIn} in
            </SpecFact>
            <SpecFact label="Keep text inside">{spec.safeZoneInsetIn} in of the cut</SpecFact>
          </dl>
          <p className="mt-4 text-[14.45px] leading-relaxed text-kc-dark/60">
            Extend backgrounds and edge-to-edge images all the way to {doc.widthIn} ×{" "}
            {doc.heightIn} in. PDF, PNG, JPG or TIFF, {spec.recommendedDpi} DPI or better, up to {spec.maxFileMb}MB.
            {roundCorners && spec.product === "business-cards" && " Rounded corners need the larger document, since the die has more play than a straight cut."}
          </p>
          {spec.note && (
            <p className="mt-2 text-[14.45px] leading-relaxed text-kc-dark/60">{spec.note}</p>
          )}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy !== "idle"}
            className="edge mt-5 flex w-full items-center justify-center gap-2 border-2 border-dashed border-kc-dark/20 p-6 text-center transition-colors hover:border-kc-coral/50 disabled:opacity-60"
          >
            {busy === "idle" ? (
              <>
                <Upload className="h-5 w-5 text-kc-dark/60" strokeWidth={1.75} />
                <span className="text-[15.52px] font-medium text-kc-dark">Choose your file</span>
              </>
            ) : (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-kc-dark/60" />
                <span className="text-[15.52px] font-medium text-kc-dark">
                  {busy === "uploading" ? "Uploading..." : "Checking your file..."}
                </span>
              </>
            )}
          </button>

          {error && (
            <p role="alert" className="mt-3 text-[14.45px] leading-snug text-red-700">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Choice({
  selected,
  icon,
  title,
  body,
  onClick,
}: {
  selected: boolean;
  icon: React.ReactNode;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "edge flex h-full flex-col items-start gap-3 border p-5 text-left transition-colors",
        selected
          ? "border-kc-coral bg-kc-coral/5"
          : "border-kc-dark/15 bg-white hover:border-kc-dark/35"
      )}
    >
      <span className={selected ? "text-kc-coral" : "text-kc-dark/60"}>{icon}</span>
      <span className="text-[16.59px] font-semibold text-kc-dark">{title}</span>
      <span className="text-[14.45px] leading-relaxed text-kc-dark/60">{body}</span>
    </button>
  );
}

function SpecFact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[13.38px] text-kc-dark/60">{label}</dt>
      <dd className="mt-0.5 font-mono text-kc-dark">{children}</dd>
    </div>
  );
}
