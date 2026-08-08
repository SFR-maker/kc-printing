"use client";

import { X } from "lucide-react";

/**
 * The close button on the promo bar.
 *
 * Split out so the bar itself can stay a server component and ship as HTML - see PromoBar for why
 * that matters. This is the only part that needs a click handler.
 *
 * It hides the bar by touching the DOM node directly rather than by lifting state up. The bar has no
 * React state to lift: it is server-rendered markup, and the pre-paint script that hides it on later
 * visits works the same way. Two mechanisms doing the same thing the same way is simpler than a
 * client wrapper that exists only to hold one boolean.
 */
export function PromoBarDismiss({ slug, domId }: { slug: string; domId: string }) {
  function dismiss() {
    try {
      window.localStorage.setItem(`kc-promo-dismissed-${slug}`, "1");
    } catch {
      // Storage can be unavailable in a locked-down private window. The bar still closes for this
      // page view; it simply comes back next time, which is the right way to fail.
    }
    const el = document.getElementById(domId);
    if (el) el.style.display = "none";
  }

  return (
    <button
      type="button"
      onClick={dismiss}
      aria-label="Dismiss this announcement"
      aria-controls={domId}
      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
    >
      <X className="h-4 w-4" />
    </button>
  );
}
