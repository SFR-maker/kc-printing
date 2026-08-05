"use client";

import { useCallback, useState } from "react";
import { useUploadThing } from "@/lib/uploadthing-client";
import { createImageElement } from "@/lib/business-card/element-factory";
import { imageEffectiveDpi } from "@/lib/business-card/validate";
import { MIN_PRINT_DPI } from "@/lib/business-card/print-spec";
import { useCardEditorStore } from "@/lib/business-card/store";

/**
 * Uploads an image file and drops it onto the active side of the card.
 *
 * Shared by the Upload button, by paste, and by drag-and-drop so all three agree on what is
 * accepted, how large it may be, and the resolution warning - the button previously owned this
 * logic privately, which is why pasting or dragging a logo did nothing at all.
 */

export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
export const MAX_IMAGE_BYTES = 16 * 1024 * 1024;

function loadImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
}

export interface ImageInsert {
  insertFile: (file: File) => Promise<void>;
  status: "idle" | "uploading" | "error";
  notice: string | null;
  clearNotice: () => void;
}

export function useImageInsert(): ImageInsert {
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [notice, setNotice] = useState<string | null>(null);

  const { startUpload } = useUploadThing("cardAsset", {
    onUploadError: () => {
      setStatus("error");
      setNotice("That upload failed. Please try a different file.");
    },
  });

  const insertFile = useCallback(
    async (file: File) => {
      setNotice(null);

      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setNotice("That file type isn't supported. Use a PNG, JPG, WebP, or SVG.");
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setNotice("That image is too large. The maximum is 16MB.");
        return;
      }

      setStatus("uploading");
      try {
        const result = await startUpload([file]);
        const uploaded = result?.[0];
        if (!uploaded?.url) throw new Error("Upload did not return a URL");
        const dims = await loadImageDimensions(uploaded.url);

        // Read the store at insert time rather than closing over it: the upload is asynchronous and
        // the customer may well have switched sides while it was in flight.
        const { activeSide, design, addElement } = useCardEditorStore.getState();
        const elements = activeSide === "front" ? design.front.elements : design.back.elements;

        const el = createImageElement(
          { src: uploaded.url, naturalWidthPx: dims.width, naturalHeightPx: dims.height },
          elements,
        );
        addElement(activeSide, el);
        setStatus("idle");

        const dpi = imageEffectiveDpi(dims.width, el.width);
        if (dpi < MIN_PRINT_DPI) {
          setNotice(
            `That image is about ${Math.round(dpi)} DPI at the size it was placed. It may print blurry - use a larger file, or scale it down on the card.`,
          );
        }
      } catch {
        setStatus("error");
        setNotice("Something went wrong adding that image.");
      }
    },
    [startUpload],
  );

  return { insertFile, status, notice, clearNotice: () => setNotice(null) };
}

/** The first image file in a paste or drop, if there is one. */
export function firstImageFile(data: DataTransfer | null): File | null {
  if (!data) return null;
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  for (const file of Array.from(data.files ?? [])) {
    if (file.type.startsWith("image/")) return file;
  }
  return null;
}
