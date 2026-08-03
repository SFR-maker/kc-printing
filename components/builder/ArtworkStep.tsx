"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, PenLine, FileCheck2 } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing-client";
import { businessCardDocSpec } from "@/lib/business-card/print-spec";
import type { ArtworkInspection } from "@/lib/business-card/inspect-artwork";
import { ArtworkProof } from "@/components/builder/ArtworkProof";
import { cn } from "@/lib/utils";

export type ArtworkPath = "UPLOAD" | "DESIGN_SERVICE";

export interface ArtworkState {
  path: ArtworkPath | null;
  fileUrl: string | null;
  fileName: string | null;
  inspection: ArtworkInspection | null;
  approved: boolean;
}

export const EMPTY_ARTWORK: ArtworkState = {
  path: null,
  fileUrl: null,
  fileName: null,
  inspection: null,
  approved: false,
};

/**
 * True when the customer can move on: either our designers are doing the work, or they have
 * uploaded a file, we have measured it, and they have ticked the approval box.
 */
export function artworkComplete(a: ArtworkState): boolean {
  if (a.path === "DESIGN_SERVICE") return true;
  return a.path === "UPLOAD" && !!a.fileUrl && !!a.inspection && a.approved;
}

export function ArtworkStep({
  value,
  onChange,
  roundCorners,
}: {
  value: ArtworkState;
  onChange: (next: ArtworkState) => void;
  roundCorners: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"idle" | "uploading" | "inspecting">("idle");
  const [error, setError] = useState<string | null>(null);
  const spec = businessCardDocSpec(roundCorners);

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

      onChange({
        path: "UPLOAD",
        fileUrl: first.url,
        fileName: first.name,
        inspection: payload as ArtworkInspection,
        approved: false,
      });
    } catch {
      setError("Something went wrong uploading that file. Please try again.");
    } finally {
      setBusy("idle");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  // Once a proof exists, it is the whole step.
  if (value.path === "UPLOAD" && value.inspection && value.fileUrl && value.fileName) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-[14px] text-kc-dark/70">
          <FileCheck2 className="h-4 w-4 text-kc-coral" strokeWidth={1.75} />
          <span className="truncate font-medium text-kc-dark">{value.fileName}</span>
        </div>
        <ArtworkProof
          fileUrl={value.fileUrl}
          fileName={value.fileName}
          inspection={value.inspection}
          approved={value.approved}
          onApprovedChange={(approved) => onChange({ ...value, approved })}
          onReplace={() => {
            onChange({ ...EMPTY_ARTWORK, path: "UPLOAD" });
            setError(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Choice
          selected={value.path === "UPLOAD"}
          icon={<Upload className="h-5 w-5" strokeWidth={1.75} />}
          title="I have my own design"
          body={`Upload a print-ready file at ${spec.docWidthIn} × ${spec.docHeightIn} in. We'll show you a proof to approve.`}
          onClick={() => {
            onChange({ ...EMPTY_ARTWORK, path: "UPLOAD" });
            inputRef.current?.click();
          }}
        />
        <Choice
          selected={value.path === "DESIGN_SERVICE"}
          icon={<PenLine className="h-5 w-5" strokeWidth={1.75} />}
          title="Design it for me"
          body="Tell us about your business and a real designer builds the layout. First draft in 1 to 3 business days."
          onClick={() => onChange({ ...EMPTY_ARTWORK, path: "DESIGN_SERVICE" })}
        />
      </div>

      {value.path === "UPLOAD" && (
        <div className="edge border border-kc-dark/12 bg-white p-5">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-[13.5px] sm:grid-cols-3">
            <SpecFact label="Upload at">
              {spec.docWidthIn} × {spec.docHeightIn} in
            </SpecFact>
            <SpecFact label="Cuts to">
              {spec.trimWidthIn} × {spec.trimHeightIn} in
            </SpecFact>
            <SpecFact label="Keep text inside">{spec.safeZoneInsetIn} in of the cut</SpecFact>
          </dl>
          <p className="mt-4 text-[13.5px] leading-relaxed text-kc-dark/60">
            Extend backgrounds and edge-to-edge images all the way to {spec.docWidthIn} ×{" "}
            {spec.docHeightIn} in. PDF, PNG, JPG or TIFF, 300 DPI or better.
            {roundCorners && " Rounded corners need the larger document, since the die has more play than a straight cut."}
          </p>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy !== "idle"}
            className="edge mt-5 flex w-full items-center justify-center gap-2 border-2 border-dashed border-kc-dark/20 p-6 text-center transition-colors hover:border-kc-coral/50 disabled:opacity-60"
          >
            {busy === "idle" ? (
              <>
                <Upload className="h-5 w-5 text-kc-dark/50" strokeWidth={1.75} />
                <span className="text-[14.5px] font-medium text-kc-dark">Choose your artwork</span>
              </>
            ) : (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-kc-dark/50" />
                <span className="text-[14.5px] font-medium text-kc-dark">
                  {busy === "uploading" ? "Uploading..." : "Checking your file..."}
                </span>
              </>
            )}
          </button>

          {error && (
            <p role="alert" className="mt-3 text-[13.5px] leading-snug text-red-700">
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
      <span className={selected ? "text-kc-coral" : "text-kc-dark/50"}>{icon}</span>
      <span className="text-[15.5px] font-semibold text-kc-dark">{title}</span>
      <span className="text-[13.5px] leading-relaxed text-kc-dark/60">{body}</span>
    </button>
  );
}

function SpecFact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[12.5px] text-kc-dark/50">{label}</dt>
      <dd className="mt-0.5 font-mono text-kc-dark">{children}</dd>
    </div>
  );
}
