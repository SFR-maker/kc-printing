"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShoppingBag, X, Loader2 } from "lucide-react";
import { cn, formatDollars } from "@/lib/utils";
import {
  clearSavedDraft,
  forgetPendingOrder,
  listPendingOrders,
  listSavedDrafts,
  onCartChange,
  serviceLabel,
  type PendingOrder,
} from "@/lib/cart/pending";
import type { PendingOrderSummary } from "@/app/api/orders/pending/route";

/**
 * Somewhere to pick an unfinished order back up.
 *
 * Before this, abandoning checkout lost everything. Someone who had chosen a size and paper,
 * uploaded artwork, approved a proof and reached the payment screen - then went to find a different
 * card, or simply closed the tab - came back to an empty configurator with no trace of any of it.
 * The order still existed in the database the whole time; there was just no way to reach it.
 *
 * The button shows two kinds of thing, and keeps them visually distinct because the customer's next
 * action differs:
 *
 *   unpaid orders   - priced and saved. One click returns them to Stripe.
 *   saved setups    - options chosen but never submitted. Reopens the product page.
 *
 * It renders nothing at all when there is nothing to resume. An always-present empty cart on a shop
 * that does not have a multi-item basket would just be a permanently sad icon.
 */
export function CartButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<PendingOrderSummary[]>([]);
  const [drafts, setDrafts] = useState<{ service: string }[]>([]);
  const [resuming, setResuming] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  /**
   * Reconciles what the browser remembers against what the server still considers outstanding.
   *
   * The local list goes stale on every successful payment - the Stripe webhook marks the order PAID
   * but nothing tells this tab - so anything the server no longer returns is dropped. Without that,
   * the cart would nag people to pay for orders they have already paid for.
   */
  const refresh = useCallback(async () => {
    // Read storage first but publish nothing yet: a setState before the first await runs
    // synchronously inside the effect below and cascades an extra render.
    const local: PendingOrder[] = listPendingOrders();
    const saved = listSavedDrafts();

    try {
      const qs = local.length ? `?ids=${encodeURIComponent(local.map((o) => o.orderId).join(","))}` : "";
      const res = await fetch(`/api/orders/pending${qs}`);
      if (!res.ok) throw new Error("failed");
      const { orders: live } = (await res.json()) as { orders: PendingOrderSummary[] };
      setDrafts(saved);
      setOrders(live);
      const stillOpen = new Set(live.map((o) => o.id));
      for (const o of local) if (!stillOpen.has(o.orderId)) forgetPendingOrder(o.orderId);
    } catch {
      setDrafts(saved);
      // Offline or the endpoint is unhappy: fall back to what the browser knows rather than
      // showing an empty cart, which would read as "your order is gone".
      setOrders(local.map((o) => ({ id: o.orderId, service: o.service, total: o.total, createdAt: new Date(o.savedAt).toISOString() })));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const run = () => { if (alive) void refresh(); };
    /*
     * Deferred by a tick rather than called inline.
     *
     * refresh() only sets state after awaiting the fetch, but from the effect's point of view it is
     * still a call that may update state synchronously, and the lint rule is right not to assume
     * otherwise. Scheduling it costs nothing here - the button renders nothing until there is
     * something to show - and keeps the first paint free of a cascading render.
     */
    const timer = setTimeout(run, 0);
    const unsubscribe = onCartChange(run);
    return () => {
      alive = false;
      clearTimeout(timer);
      unsubscribe();
    };
  }, [refresh]);

  // Close on outside click and on Escape, the two ways anyone expects to dismiss a popover.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /** Sends the customer back to Stripe for an order that already exists. */
  async function resume(orderId: string) {
    setResuming(orderId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        // assign() rather than assigning to .href: same navigation, and not a mutation the
        // React Compiler lint has to reason about.
        window.location.assign(data.url);
        return;
      }
      setResuming(null);
    } catch {
      setResuming(null);
    }
  }

  const count = orders.length + drafts.length;
  if (count === 0) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Unfinished orders (${count})`}
        className={cn("relative flex items-center gap-1.5 text-kc-dark/70 transition-colors hover:text-kc-magenta-deep", className)}
      >
        <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
        <span
          aria-hidden="true"
          className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-kc-coral px-1 font-mono text-[10px] font-bold text-white"
        >
          {count}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Unfinished orders"
          className="absolute right-0 top-full z-50 mt-3 w-80 border border-kc-dark/12 bg-white p-4 shadow-lg"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <h2 className="text-[14.45px] font-semibold text-kc-dark">Pick up where you left off</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-kc-dark/50 hover:text-kc-dark">
              <X className="h-4 w-4" />
            </button>
          </div>

          {orders.length > 0 && (
            <section className="mb-4">
              <h3 className="mb-2 font-mono text-[10.5px] uppercase tracking-wider text-kc-dark/50">Awaiting payment</h3>
              <ul className="space-y-2">
                {orders.map((o) => (
                  <li key={o.id} className="border border-kc-dark/10 p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[14.45px] font-medium text-kc-dark">{serviceLabel(o.service)}</span>
                      <span className="font-mono text-[13.38px] text-kc-dark/70">{formatDollars(o.total)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => resume(o.id)}
                      disabled={resuming === o.id}
                      className="mt-2 inline-flex items-center gap-1.5 text-[13.91px] font-semibold text-kc-magenta-deep hover:text-kc-dark disabled:opacity-60"
                    >
                      {resuming === o.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {resuming === o.id ? "Opening checkout…" : "Complete payment →"}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {drafts.length > 0 && (
            <section>
              <h3 className="mb-2 font-mono text-[10.5px] uppercase tracking-wider text-kc-dark/50">Saved setups</h3>
              <ul className="space-y-2">
                {drafts.map((d) => (
                  <li key={d.service} className="flex items-center justify-between gap-2 border border-kc-dark/10 p-3">
                    <Link
                      href={`/services/${d.service}`}
                      onClick={() => setOpen(false)}
                      className="text-[14.45px] font-medium text-kc-dark hover:text-kc-magenta-deep"
                    >
                      {serviceLabel(d.service)}
                    </Link>
                    <button
                      type="button"
                      onClick={() => clearSavedDraft(d.service)}
                      aria-label={`Discard saved ${serviceLabel(d.service)} setup`}
                      className="text-kc-dark/40 hover:text-kc-dark"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="mt-4 border-t border-kc-dark/10 pt-3 text-[12.5px] leading-snug text-kc-dark/60">
            Nothing is charged until you complete payment. Need a hand?{" "}
            <a href="tel:+18165210462" className="font-semibold text-kc-magenta-deep hover:text-kc-dark">(816) 521-0462</a>
          </p>
        </div>
      )}
    </div>
  );
}
