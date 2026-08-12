"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One-click copying for anything an admin would otherwise select by hand.
 *
 * Order numbers, emails, tracking numbers and artwork URLs all get retyped into other systems -
 * a courier's site, a supplier's order form, a reply to the customer - and highlighting a fragment
 * of text with a mouse is both fiddly and easy to get wrong by a character. A character wrong in a
 * tracking number is a parcel nobody can find.
 */

/** Feedback lasts long enough to be read and short enough not to look stuck. */
const CONFIRM_MS = 1600;

export function CopyButton({
  value,
  label,
  className,
  variant = "icon",
}: {
  value: string;
  /** Names the thing being copied, for the tooltip and for screen readers. */
  label: string;
  className?: string;
  /** `icon` sits beside a value; `button` is a labelled control for copying a whole block. */
  variant?: "icon" | "button";
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clears on unmount so a state update never lands on a component that has gone.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setFailed(false);
    } catch {
      /*
       * The clipboard API needs a secure context and permission, and refuses in some embedded
       * browsers. Saying so beats a button that silently does nothing - the admin can then select
       * the text by hand rather than pasting whatever was on the clipboard already.
       */
      setFailed(true);
      setCopied(false);
    }
    timer.current = setTimeout(() => { setCopied(false); setFailed(false); }, CONFIRM_MS);
  }

  const state = failed ? "Press Ctrl+C to copy" : copied ? "Copied" : `Copy ${label}`;

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={copy}
        aria-label={state}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-kc-border px-3 py-1.5 text-xs font-semibold transition-colors",
          copied ? "border-kc-sage/40 bg-kc-sage/10 text-kc-sage" : "text-kc-dark hover:bg-kc-bg",
          failed && "border-amber-300 bg-amber-50 text-amber-800",
          className,
        )}
      >
        {copied ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />}
        {failed ? "Couldn't copy" : copied ? "Copied" : label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={state}
      aria-label={state}
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-kc-muted transition-colors hover:bg-kc-bg hover:text-kc-dark",
        copied && "text-kc-sage",
        failed && "text-amber-700",
        className,
      )}
    >
      {copied
        ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        : <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />}
      {/* Announced rather than shown: the tick is the visual feedback, and a live region is what
          tells a screen reader the click did anything at all. */}
      <span aria-live="polite" className="sr-only">{copied ? `${label} copied` : ""}</span>
    </button>
  );
}

/**
 * A value with its copy control, for a definition-list row.
 *
 * Renders nothing copyable when there is no value, so an empty field does not offer to copy the
 * em dash standing in for it.
 */
export function CopyableValue({
  value,
  label,
  className,
  mono,
}: {
  value: string | null | undefined;
  label: string;
  className?: string;
  mono?: boolean;
}) {
  if (!value) return <span className="text-kc-muted">—</span>;
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className={mono ? "font-mono" : undefined}>{value}</span>
      <CopyButton value={value} label={label} />
    </span>
  );
}
