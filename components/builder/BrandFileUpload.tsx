"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, X, FileIcon } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing-client";

export interface BrandFile {
  url: string;
  name: string;
}

export function BrandFileUpload({ value, onChange }: { value: BrandFile[]; onChange: (files: BrandFile[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [warning, setWarning] = useState<string | null>(null);

  const { startUpload } = useUploadThing("brandFile", {
    onUploadError: (e) => {
      setStatus("error");
      setWarning(e.message.includes("FileSizeMismatch") ? "One of those files is too large (32MB max)." : "Upload failed. Please try a different file.");
    },
  });

  async function handleFiles(fileList: FileList) {
    setWarning(null);
    setStatus("uploading");
    try {
      const result = await startUpload(Array.from(fileList));
      if (!result?.length) throw new Error("Upload did not return any files");
      onChange([...value, ...result.map((f) => ({ url: f.url, name: f.name }))]);
      setStatus("idle");
    } catch {
      setStatus("error");
      setWarning("Something went wrong uploading those files.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(url: string) {
    onChange(value.filter((f) => f.url !== url));
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".tif,.tiff,.eps,.ai,.psd,.bmp,.gif,.jpg,.jpeg,.png,.pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={status === "uploading"}
        className="w-full border-2 border-dashed border-kc-border rounded-xl p-6 text-center transition-colors hover:border-kc-teal/40 disabled:opacity-60"
      >
        {status === "uploading" ? (
          <Loader2 className="h-8 w-8 text-kc-muted mx-auto mb-2 animate-spin" />
        ) : (
          <Upload className="h-8 w-8 text-kc-muted mx-auto mb-2" />
        )}
        <p className="text-sm font-medium text-kc-dark mb-1">{status === "uploading" ? "Uploading..." : "Upload Brand Files"}</p>
        <p className="text-xs text-kc-muted">TIF, TIFF, EPS, AI, PSD, BMP, GIF, JPG, PNG, PDF up to 32MB</p>
      </button>

      {warning && <p className="text-xs text-red-500">{warning}</p>}

      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((f) => (
            <li key={f.url} className="flex items-center justify-between gap-2 rounded-lg border border-kc-border bg-kc-bg px-3 py-2 text-xs">
              <span className="flex min-w-0 items-center gap-1.5 truncate text-kc-dark">
                <FileIcon className="h-3.5 w-3.5 shrink-0 text-kc-muted" />
                <span className="truncate">{f.name}</span>
              </span>
              <button type="button" onClick={() => remove(f.url)} className="shrink-0 text-kc-muted hover:text-red-500" aria-label={`Remove ${f.name}`}>
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
