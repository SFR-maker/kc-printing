"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatDollars } from "@/lib/utils";
import {
  BC_SIZES,
  BC_PAPERS,
  BC_COLORS,
  calculateBusinessCardPrice,
  availableQuantities,
  isComboAvailable,
  type BcPriceBreakdown,
} from "@/lib/pricing/business-cards";

export interface BusinessCardSpec {
  sizeId: number;
  paperId: number;
  colorId: number;
  quantity: number;
  rush: boolean;
  roundCorners: boolean;
  manualProof: boolean;
}

const RUSH_MAX_QUANTITY = 2500;

function formatQuantity(q: number): string {
  return q.toLocaleString("en-US");
}

export function BusinessCardPrintSpec({ spec, onChange }: { spec: BusinessCardSpec; onChange: (next: BusinessCardSpec) => void }) {
  const comboOk = isComboAvailable(spec.sizeId, spec.paperId, spec.colorId);
  const quantities = comboOk ? availableQuantities(spec.sizeId, spec.paperId, spec.colorId) : [];
  const price: BcPriceBreakdown = calculateBusinessCardPrice(spec);

  function set<K extends keyof BusinessCardSpec>(key: K, value: BusinessCardSpec[K]) {
    const next = { ...spec, [key]: value };
    // If the new size/paper/color combo doesn't offer the current quantity (or the combo itself
    // isn't sold), snap to the nearest thing that is, instead of silently showing an invalid price.
    if (key === "sizeId" || key === "paperId" || key === "colorId") {
      const nextQtys = isComboAvailable(next.sizeId, next.paperId, next.colorId)
        ? availableQuantities(next.sizeId, next.paperId, next.colorId)
        : [];
      if (nextQtys.length > 0 && !nextQtys.includes(next.quantity)) {
        next.quantity = nextQtys.reduce((closest, q) => (Math.abs(q - next.quantity) < Math.abs(closest - next.quantity) ? q : closest), nextQtys[0]);
      }
      if (!nextQtys.includes(RUSH_MAX_QUANTITY) && next.quantity > RUSH_MAX_QUANTITY) {
        next.rush = false;
      }
    }
    if (key === "quantity" && Number(value) > RUSH_MAX_QUANTITY) {
      next.rush = false;
    }
    onChange(next);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Size</Label>
          <Select value={String(spec.sizeId)} onValueChange={(v) => v && set("sizeId", Number(v))}>
            <SelectTrigger><SelectValue>{(v: string) => BC_SIZES.find((s) => String(s.id) === v)?.label ?? v}</SelectValue></SelectTrigger>
            <SelectContent>
              {BC_SIZES.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Paper Stock</Label>
          <Select value={String(spec.paperId)} onValueChange={(v) => v && set("paperId", Number(v))}>
            <SelectTrigger><SelectValue>{(v: string) => BC_PAPERS.find((p) => String(p.id) === v)?.label ?? v}</SelectValue></SelectTrigger>
            <SelectContent>
              {BC_PAPERS.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Sides</Label>
          <Select value={String(spec.colorId)} onValueChange={(v) => v && set("colorId", Number(v))}>
            <SelectTrigger><SelectValue>{(v: string) => BC_COLORS.find((c) => String(c.id) === v)?.label ?? v}</SelectValue></SelectTrigger>
            <SelectContent>
              {BC_COLORS.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!comboOk && (
            <p className="text-xs text-amber-600">This paper doesn&apos;t support that side option — pick a different paper or sides.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Quantity</Label>
          <Select value={String(spec.quantity)} onValueChange={(v) => v && set("quantity", Number(v))} disabled={quantities.length === 0}>
            <SelectTrigger><SelectValue>{(v: string) => `${formatQuantity(Number(v))} cards`}</SelectValue></SelectTrigger>
            <SelectContent>
              {quantities.map((q) => (
                <SelectItem key={q} value={String(q)}>{formatQuantity(q)} cards</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => set("rush", !spec.rush)}
          disabled={spec.quantity > RUSH_MAX_QUANTITY}
          className={`flex w-full items-center justify-between rounded-lg border-2 p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${spec.rush ? "border-kc-coral bg-kc-coral/5" : "border-kc-border bg-white hover:border-kc-coral/40"}`}
        >
          <div>
            <span className="text-sm font-semibold text-kc-dark">Rush Turnaround</span>
            <p className="text-xs text-kc-muted">Faster production. {spec.quantity > RUSH_MAX_QUANTITY ? `Only available up to ${formatQuantity(RUSH_MAX_QUANTITY)} cards.` : "Adds a surcharge to the print cost."}</p>
          </div>
          {price.valid && spec.rush && <Badge className="border-0 bg-kc-coral/20 text-kc-coral text-xs">+{formatDollars(price.rushSurcharge)}</Badge>}
        </button>

        <button
          type="button"
          onClick={() => set("roundCorners", !spec.roundCorners)}
          className={`flex w-full items-center justify-between rounded-lg border-2 p-3 text-left transition-colors ${spec.roundCorners ? "border-kc-teal bg-kc-teal/5" : "border-kc-border bg-white hover:border-kc-teal/40"}`}
        >
          <div>
            <span className="text-sm font-semibold text-kc-dark">Round Corners</span>
            <p className="text-xs text-kc-muted">A softer, more premium edge.</p>
          </div>
          {price.valid && spec.roundCorners && <Badge className="border-0 bg-kc-teal/20 text-kc-teal text-xs">+{formatDollars(price.roundCornersPrice)}</Badge>}
        </button>

        <button
          type="button"
          onClick={() => set("manualProof", !spec.manualProof)}
          className={`flex w-full items-center justify-between rounded-lg border-2 p-3 text-left transition-colors ${spec.manualProof ? "border-kc-teal bg-kc-teal/5" : "border-kc-border bg-white hover:border-kc-teal/40"}`}
        >
          <div>
            <span className="text-sm font-semibold text-kc-dark">Manual Proof Review</span>
            <p className="text-xs text-kc-muted">A person checks your file before print (24 hrs). Instant automated proofing is free and used by default.</p>
          </div>
          {spec.manualProof && <Badge className="border-0 bg-kc-teal/20 text-kc-teal text-xs">+{formatDollars(3)}</Badge>}
        </button>
      </div>

      <div className="rounded-xl border border-kc-border bg-kc-bg p-4">
        {price.valid ? (
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-kc-muted">
              <span>Printing ({formatQuantity(spec.quantity)} cards)</span>
              <span>{formatDollars(price.basePrice)}</span>
            </div>
            {price.rushSurcharge > 0 && (
              <div className="flex justify-between text-kc-muted">
                <span>Rush surcharge</span>
                <span>{formatDollars(price.rushSurcharge)}</span>
              </div>
            )}
            {price.roundCornersPrice > 0 && (
              <div className="flex justify-between text-kc-muted">
                <span>Round corners</span>
                <span>{formatDollars(price.roundCornersPrice)}</span>
              </div>
            )}
            {price.proofPrice > 0 && (
              <div className="flex justify-between text-kc-muted">
                <span>Manual proof</span>
                <span>{formatDollars(price.proofPrice)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-kc-border pt-1.5 font-bold text-kc-dark">
              <span>Print Total</span>
              <span className="text-kc-teal">{formatDollars(price.total)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-amber-600">{price.error ?? "Select a valid combination to see pricing."}</p>
        )}
      </div>
    </div>
  );
}
