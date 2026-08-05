"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { firstImageFile, useImageInsert } from "@/lib/business-card/use-image-insert";

/**
 * Lets a logo arrive by paste or by drag-and-drop, not only through the Upload button.
 *
 * Copying a logo and pressing Ctrl+V is how most people expect to get an image into an editor, and
 * dragging the file in is the other. Neither did anything before, so the only route was finding the
 * Upload control in the side panel.
 *
 * Wraps the canvas area rather than replacing it: children render normally and this only adds the
 * listeners plus an overlay while a file is being dragged over.
 */
export function LogoDropZone({ children }: { children: React.ReactNode }) {
  const { insertFile, status, notice, clearNotice } = useImageInsert();
  const [draggingOver, setDraggingOver] = useState(false);

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const file = firstImageFile(e.clipboardData);
      if (!file) return; // Let ordinary text pastes through untouched.
      e.preventDefault();
      void insertFile(file);
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [insertFile]);

  // A dismissable notice rather than a permanent one; resolution warnings are advice, not errors.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(clearNotice, 9000);
    return () => clearTimeout(t);
  }, [notice, clearNotice]);

  return (
    <div
      className="relative flex flex-1 flex-col overflow-hidden"
      onDragOver={(e) => {
        if (!Array.from(e.dataTransfer.types).includes("Files")) return;
        e.preventDefault();
        setDraggingOver(true);
      }}
      onDragLeave={(e) => {
        // Only clear when the pointer actually leaves the zone, not when it crosses a child.
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setDraggingOver(false);
      }}
      onDrop={(e) => {
        const file = firstImageFile(e.dataTransfer);
        setDraggingOver(false);
        if (!file) return;
        e.preventDefault();
        void insertFile(file);
      }}
    >
      {children}

      {draggingOver && (
        <div className="pointer-events-none absolute inset-3 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed border-kc-coral bg-kc-coral/10">
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-kc-magenta-deep shadow-lg">
            <ImagePlus className="h-4 w-4" /> Drop to add your logo
          </div>
        </div>
      )}

      {status === "uploading" && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-kc-dark px-4 py-2 text-sm font-medium text-white shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" /> Adding your image…
        </div>
      )}

      {notice && (
        <div className="absolute bottom-4 left-1/2 z-30 max-w-md -translate-x-1/2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 shadow-lg">
          <button type="button" onClick={clearNotice} className="float-right ml-3 text-amber-700 hover:text-amber-900" aria-label="Dismiss">
            ×
          </button>
          {notice}
        </div>
      )}
    </div>
  );
}
