"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing-client";
import { createImageElement } from "@/lib/business-card/element-factory";
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

export function ImageUploadButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [warning, setWarning] = useState<string | null>(null);
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
      const uploaded = result?.[0];
      if (!uploaded?.url) throw new Error("Upload did not return a URL");

      const dims = await loadImageDimensions(uploaded.url);
      const el = createImageElement({ src: uploaded.url, naturalWidthPx: dims.width, naturalHeightPx: dims.height }, elements);
      addElement(activeSide, el);

      const dpi = imageEffectiveDpi(dims.width, el.width);
      if (dpi < MIN_PRINT_DPI) {
        setWarning(`This image is about ${Math.round(dpi)} DPI at its inserted size — it may look blurry when printed. Use a larger image or shrink it on the card.`);
      }
      setStatus("idle");
    } catch {
      setStatus("error");
      setWarning("Something went wrong uploading that image.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-1.5">
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
      {warning && <p className="text-[11px] leading-snug text-amber-600">{warning}</p>}
    </div>
  );
}
