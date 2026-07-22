"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, ImageIcon, LayoutTemplate } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing-client";
import { createImageElement, createBackgroundImageElement } from "@/lib/business-card/element-factory";
import { imageEffectiveDpi } from "@/lib/business-card/validate";
import { MIN_PRINT_DPI } from "@/lib/business-card/print-spec";
import { useCardEditorStore } from "@/lib/business-card/store";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 16 * 1024 * 1024;

function loadImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
}

interface UploadedAsset {
  url: string;
  width: number;
  height: number;
}

export function ImageUploadButton({ onInserted }: { onInserted?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [warning, setWarning] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadedAsset | null>(null);
  const activeSide = useCardEditorStore((s) => s.activeSide);
  const addElement = useCardEditorStore((s) => s.addElement);
  const elements = useCardEditorStore((s) => (s.activeSide === "front" ? s.design.front.elements : s.design.back.elements));

  const { startUpload } = useUploadThing("cardAsset", {
    onUploadError: () => {
      setStatus("error");
      setWarning("Upload failed. Please try a different file.");
    },
  });

  async function handleFile(file: File) {
    setWarning(null);
    setUploaded(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setWarning("Please upload a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setWarning("Image is too large. Maximum size is 16MB.");
      return;
    }

    setStatus("uploading");
    try {
      const result = await startUpload([file]);
      const file0 = result?.[0];
      if (!file0?.url) throw new Error("Upload did not return a URL");
      const dims = await loadImageDimensions(file0.url);
      setUploaded({ url: file0.url, width: dims.width, height: dims.height });
      setStatus("idle");
    } catch {
      setStatus("error");
      setWarning("Something went wrong uploading that image.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function insertAsImage() {
    if (!uploaded) return;
    const el = createImageElement({ src: uploaded.url, naturalWidthPx: uploaded.width, naturalHeightPx: uploaded.height }, elements);
    addElement(activeSide, el);
    const dpi = imageEffectiveDpi(uploaded.width, el.width);
    if (dpi < MIN_PRINT_DPI) {
      setWarning(`This image is about ${Math.round(dpi)} DPI at its inserted size — it may look blurry when printed. Use a larger image or shrink it on the card.`);
    }
    onInserted?.();
  }

  function applyAsBackground() {
    if (!uploaded) return;
    const el = createBackgroundImageElement({ src: uploaded.url, naturalWidthPx: uploaded.width, naturalHeightPx: uploaded.height }, elements);
    addElement(activeSide, el, false);
    const dpi = imageEffectiveDpi(uploaded.width, el.width);
    if (dpi < MIN_PRINT_DPI) {
      setWarning(`This image is about ${Math.round(dpi)} DPI at full-card size — it may look blurry when printed.`);
    }
    onInserted?.();
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={status === "uploading"}
        className="flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed border-kc-border bg-kc-bg px-3 py-4 text-xs font-medium text-kc-muted transition-colors hover:border-kc-teal/50 hover:text-kc-teal disabled:opacity-60"
      >
        {status === "uploading" ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
        {status === "uploading" ? "Uploading..." : "Upload Image or Logo"}
      </button>

      {uploaded && (
        <div className="flex items-center gap-2 rounded-lg border border-kc-teal/30 bg-kc-teal/5 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={uploaded.url} alt="Uploaded" className="h-12 w-12 rounded-md object-cover" />
          <div className="flex flex-1 flex-col gap-1.5">
            <button onClick={insertAsImage} className="flex items-center justify-center gap-1.5 rounded-md bg-kc-teal py-1.5 text-xs font-semibold text-white hover:bg-kc-teal/90">
              <ImageIcon className="h-3.5 w-3.5" /> Insert as Image
            </button>
            <button onClick={applyAsBackground} className="flex items-center justify-center gap-1.5 rounded-md border border-kc-border py-1.5 text-xs font-semibold text-kc-dark hover:bg-white">
              <LayoutTemplate className="h-3.5 w-3.5" /> Set as Background
            </button>
          </div>
        </div>
      )}

      {warning && <p className="text-[11px] leading-snug text-amber-600">{warning}</p>}
    </div>
  );
}
