"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { STATUS_FLOW, STATUS_HELP, STATUS_LABELS } from "@/lib/orders/status";
import { cn } from "@/lib/utils";

interface Props {
  orderId: string;
  currentStatus: OrderStatus;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  notes: string | null;
  internalNotes: string | null;
}

/**
 * Everything an admin can do to an order, in one panel.
 *
 * Each section saves on its own. One "Save all" button would make "marked it shipped" and "edited a
 * note" the same entry in the history, which defeats the point of keeping a history at all.
 */
export function AdminOrderActions({
  orderId, currentStatus, trackingCarrier, trackingNumber, notes, internalNotes,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [carrier, setCarrier] = useState(trackingCarrier ?? "");
  const [tracking, setTracking] = useState(trackingNumber ?? "");
  const [customerNote, setCustomerNote] = useState(notes ?? "");
  const [staffNote, setStaffNote] = useState(internalNotes ?? "");
  const [timelineNote, setTimelineNote] = useState("");

  async function save(section: string, payload: Record<string, unknown>) {
    setBusy(section);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "That didn't save. Please try again.");
        return;
      }
      if ("timelineNote" in payload) setTimelineNote("");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      <Card className="border-kc-border">
        <CardContent className="space-y-3 p-4">
          <h3 className="text-sm font-bold text-kc-dark">Where is this order?</h3>
          <div className="grid gap-1.5">
            {STATUS_FLOW.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left transition-colors",
                  status === s ? "border-kc-teal bg-kc-teal/5" : "border-kc-border hover:border-kc-teal/40"
                )}
              >
                <span className="block text-sm font-semibold text-kc-dark">{STATUS_LABELS[s]}</span>
                <span className="block text-xs leading-snug text-kc-muted">{STATUS_HELP[s]}</span>
              </button>
            ))}
          </div>
          <Button
            onClick={() => save("status", { status })}
            disabled={busy !== null || status === currentStatus}
            className="w-full bg-kc-teal text-white hover:bg-kc-teal/90"
          >
            {busy === "status" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update status"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-kc-border">
        <CardContent className="space-y-3 p-4">
          <h3 className="text-sm font-bold text-kc-dark">Despatch</h3>
          <p className="text-xs leading-relaxed text-kc-muted">
            Saving a tracking number marks the order as despatched and records the date.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs text-kc-muted">Carrier</Label>
            <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="USPS, UPS, FedEx" className="border-kc-border" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-kc-muted">Tracking number</Label>
            <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="9400…" className="border-kc-border" />
          </div>
          <Button
            onClick={() => save("tracking", { trackingCarrier: carrier, trackingNumber: tracking })}
            disabled={busy !== null || (carrier === (trackingCarrier ?? "") && tracking === (trackingNumber ?? ""))}
            className="w-full bg-kc-teal text-white hover:bg-kc-teal/90"
          >
            {busy === "tracking" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save tracking"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-kc-border">
        <CardContent className="space-y-3 p-4">
          <h3 className="text-sm font-bold text-kc-dark">Add to timeline</h3>
          <p className="text-xs leading-relaxed text-kc-muted">
            A note for the history — a phone call, a reprint, anything the fields above don&apos;t cover.
          </p>
          <Textarea
            value={timelineNote}
            onChange={(e) => setTimelineNote(e.target.value)}
            rows={3}
            placeholder="Customer called to confirm the green is correct."
            className="border-kc-border"
          />
          <Button
            onClick={() => save("timeline", { timelineNote })}
            disabled={busy !== null || !timelineNote.trim()}
            className="w-full bg-kc-dark text-white hover:bg-kc-dark/90"
          >
            {busy === "timeline" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add note"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-kc-border">
        <CardContent className="space-y-3 p-4">
          <h3 className="text-sm font-bold text-kc-dark">Notes</h3>
          <div className="space-y-1.5">
            <Label className="text-xs text-kc-muted">Customer-visible note</Label>
            <Textarea value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} rows={3} className="border-kc-border" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-kc-muted">Internal note — staff only</Label>
            <Textarea value={staffNote} onChange={(e) => setStaffNote(e.target.value)} rows={3} className="border-kc-border" />
          </div>
          <Button
            onClick={() => save("notes", { notes: customerNote, internalNotes: staffNote })}
            disabled={busy !== null || (customerNote === (notes ?? "") && staffNote === (internalNotes ?? ""))}
            variant="outline"
            className="w-full border-kc-border"
          >
            {busy === "notes" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save notes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
