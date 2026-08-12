"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Palette, Trash2, Truck, Undo2 } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { OrderStatusBadge, PaymentBadge } from "@/components/admin/OrderStatusBadge";
import { canDelete, canRefund } from "@/lib/orders/deletable";
import { cn, formatDollars } from "@/lib/utils";
import { CopyButton } from "@/components/admin/CopyButton";

export interface AdminOrderRow {
  id: string;
  status: OrderStatus;
  total: number;
  amountPaid: number | null;
  stripePaymentStatus: string | null;
  stripeSessionId: string | null;
  guestEmail: string | null;
  shippingName: string | null;
  trackingNumber: string | null;
  artworkPath: string;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
  productName: string | null;
  quantity: number | null;
}

/**
 * The orders table, with selection and the two destructive actions.
 *
 * Both are irreversible, so neither happens on a single click: delete asks for confirmation naming
 * what is about to go, and refund asks for confirmation naming the amount. Neither is offered at
 * all on an order where it would be refused, so the buttons on screen are only the ones that work.
 */
export function AdminOrderTable({ orders }: { orders: AdminOrderRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const selectable = orders.filter(canDelete);
  const selectedDeletable = [...selected].filter((id) => selectable.some((o) => o.id === id));
  const allSelected = selectable.length > 0 && selectedDeletable.length === selectable.length;

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function bulkDelete() {
    const n = selectedDeletable.length;
    if (n === 0) return;
    if (!confirm(`Permanently delete ${n} ${n === 1 ? "order" : "orders"}? This cannot be undone.`)) return;

    setBusy("bulk");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/orders/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: selectedDeletable }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({ tone: "bad", text: body?.error ?? "Could not delete those orders." });
        return;
      }
      const refused = body.refused?.length ?? 0;
      setMessage({
        tone: "ok",
        text: `Deleted ${body.deleted} ${body.deleted === 1 ? "order" : "orders"}.${
          refused > 0 ? ` ${refused} kept — ${body.refused[0].reason}` : ""
        }`,
      });
      setSelected(new Set());
      router.refresh();
    } catch {
      setMessage({ tone: "bad", text: "Couldn't reach the server." });
    } finally {
      setBusy(null);
    }
  }

  async function deleteOne(order: AdminOrderRow) {
    if (!confirm(`Permanently delete order #${order.id.slice(-8)}? This cannot be undone.`)) return;
    setBusy(order.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({ tone: "bad", text: body?.error ?? "Could not delete that order." });
        return;
      }
      setMessage({ tone: "ok", text: `Order #${order.id.slice(-8)} deleted.` });
      router.refresh();
    } catch {
      setMessage({ tone: "bad", text: "Couldn't reach the server." });
    } finally {
      setBusy(null);
    }
  }

  async function refund(order: AdminOrderRow) {
    const amount = order.amountPaid ?? 0;
    if (!confirm(`Refund ${formatDollars(amount)} to the customer? The money leaves your Stripe balance immediately.`)) return;

    setBusy(order.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({ tone: "bad", text: body?.detail ?? body?.error ?? "The refund did not go through." });
        return;
      }
      setMessage({ tone: "ok", text: `Refunded ${formatDollars(body.refunded)} on #${order.id.slice(-8)}.` });
      router.refresh();
    } catch {
      setMessage({ tone: "bad", text: "Couldn't reach the server." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {message && (
        <p
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            message.tone === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          )}
        >
          {message.text}
        </p>
      )}

      {selectedDeletable.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-kc-dark bg-kc-dark px-4 py-3">
          <span className="text-sm font-semibold text-white">
            {selectedDeletable.length} selected
          </span>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelected(new Set())} className="text-xs text-white/60 hover:text-white">
              Clear
            </button>
            <button
              onClick={bulkDelete}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {busy === "bulk" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />}
              Delete selected
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-kc-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-kc-border bg-kc-bg text-xs text-kc-muted">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  disabled={selectable.length === 0}
                  onChange={(e) => setSelected(e.target.checked ? new Set(selectable.map((o) => o.id)) : new Set())}
                  aria-label="Select all deletable orders"
                  className="accent-kc-coral"
                />
              </th>
              {["Order", "Customer", "Product", "Total", "Payment", "Status", "Placed", ""].map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-kc-border">
            {orders.map((order) => {
              const deletable = canDelete(order);
              const refundable = canRefund(order);
              return (
                <tr key={order.id} className={cn("transition-colors hover:bg-kc-bg", selected.has(order.id) && "bg-kc-teal/5")}>
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(order.id)}
                      disabled={!deletable}
                      onChange={() => toggle(order.id)}
                      aria-label={`Select order ${order.id.slice(-8)}`}
                      title={deletable ? undefined : "Paid orders must be refunded before they can be deleted"}
                      className="accent-kc-coral disabled:opacity-25"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-0.5">
                      <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs font-semibold text-kc-teal hover:underline">
                        #{order.id.slice(-8)}
                      </Link>
                      <CopyButton value={order.id} label="order ID" />
                    </span>
                    <div className="mt-1 flex items-center gap-1.5 text-kc-muted">
                      {order.artworkPath === "UPLOAD" ? (
                        <FileUp className="h-3.5 w-3.5" strokeWidth={1.75} aria-label="Customer supplied the artwork" />
                      ) : (
                        <Palette className="h-3.5 w-3.5" strokeWidth={1.75} aria-label="We design it" />
                      )}
                      {order.trackingNumber && <Truck className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.75} aria-label="Despatched" />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-kc-dark">{order.customerName ?? order.shippingName ?? "—"}</div>
                    <div className="flex items-center gap-0.5 text-xs text-kc-muted">
                      {order.customerEmail ?? order.guestEmail ?? "—"}
                      {(order.customerEmail ?? order.guestEmail) && (
                        <CopyButton value={(order.customerEmail ?? order.guestEmail)!} label="email" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-kc-muted">
                    <div>{order.productName ?? "—"}</div>
                    {order.quantity != null && <div className="text-xs">{order.quantity.toLocaleString()} units</div>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-kc-dark">{formatDollars(order.total)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <PaymentBadge stripePaymentStatus={order.stripePaymentStatus} amountPaid={order.amountPaid} />
                  </td>
                  <td className="px-4 py-3"><OrderStatusBadge status={order.status} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-kc-muted">
                    {new Date(order.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {refundable && (
                        <button
                          onClick={() => refund(order)}
                          disabled={busy !== null}
                          title={`Refund ${formatDollars(order.amountPaid ?? 0)}`}
                          className="inline-flex items-center gap-1 rounded-md border border-kc-border px-2 py-1 text-xs font-medium text-kc-dark transition-colors hover:border-amber-400 hover:text-amber-700 disabled:opacity-40"
                        >
                          {busy === order.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" strokeWidth={2} />}
                          Refund
                        </button>
                      )}
                      {deletable && (
                        <button
                          onClick={() => deleteOne(order)}
                          disabled={busy !== null}
                          title="Delete permanently"
                          aria-label={`Delete order ${order.id.slice(-8)}`}
                          className="rounded-md border border-kc-border p-1.5 text-kc-muted transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-40"
                        >
                          {busy === order.id && !refundable ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
