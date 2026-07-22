"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/** Lightweight bottom sheet for mobile tool/property panels — a fixed-height, scrollable drawer
 * that slides up from the bottom, dismissible via the X button, backdrop tap, or Escape. */
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative flex max-h-[75vh] flex-col rounded-t-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-kc-border px-4 py-3">
          <span className="mx-auto h-1 w-10 shrink-0 rounded-full bg-kc-border absolute left-1/2 top-1.5 -translate-x-1/2" />
          <h2 className="pt-2 text-sm font-semibold text-kc-dark">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="pt-1 text-kc-muted hover:text-kc-dark">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
