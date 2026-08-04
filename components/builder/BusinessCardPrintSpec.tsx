"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { DEFAULT_PRICING, type PricingSettings } from "@/lib/pricing/settings";

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

// European Standard sizes (339/340) are excluded from the picker — 611 Printing only sells to a
// U.S. customer base and the extra options were just adding noise to the size dropdown.
const DISPLAYED_BC_SIZES = BC_SIZES.filter((s) => s.id !== 339 && s.id !== 340);

function formatQuantity(q: number): string {
  return q.toLocaleString("en-US");
}

export function BusinessCardPrintSpec({
  spec,
  onChange,
  pricing = DEFAULT_PRICING,
}: {
  spec: BusinessCardSpec;
  onChange: (next: BusinessCardSpec) => void;
  /** Margin and flat fees from /admin/pricing, so the quote reflects what the owner has set. */
  pricing?: PricingSettings;
}) {
  const comboOk = isComboAvailable(spec.sizeId, spec.paperId, spec.colorId);
  const quantities = comboOk ? availableQuantities(spec.sizeId, spec.paperId, spec.colorId) : [];
  const price: BcPriceBreakdown = calculateBusinessCardPrice(spec, pricing);

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

  const hasAddOns = price.rushSurcharge > 0 || price.roundCornersPrice > 0 || price.proofPrice > 0;

  return (
    <div className="space-y-5">
      {/* Core selection, boxed and given visual priority: this is the decision that actually
          drives price, so it gets the price shown immediately below it rather than buried under
          the add-ons list. */}
      <div className="rounded-xl border-2 border-kc-coral/30 bg-white p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 rounded-lg border border-kc-border bg-kc-bg p-3">
            <Label>Size</Label>
            <Select value={String(spec.sizeId)} onValueChange={(v) => v && set("sizeId", Number(v))}>
              <SelectTrigger className="bg-white"><SelectValue>{(v: string) => DISPLAYED_BC_SIZES.find((s) => String(s.id) === v)?.label ?? v}</SelectValue></SelectTrigger>
              <SelectContent>
                {DISPLAYED_BC_SIZES.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 rounded-lg border border-kc-border bg-kc-bg p-3">
            <Label>Paper Stock</Label>
            <Select value={String(spec.paperId)} onValueChange={(v) => v && set("paperId", Number(v))}>
              <SelectTrigger className="bg-white"><SelectValue>{(v: string) => BC_PAPERS.find((p) => String(p.id) === v)?.label ?? v}</SelectValue></SelectTrigger>
              <SelectContent>
                {BC_PAPERS.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 rounded-lg border border-kc-border bg-kc-bg p-3">
            <Label>Sides</Label>
            <Select value={String(spec.colorId)} onValueChange={(v) => v && set("colorId", Number(v))}>
              <SelectTrigger className="bg-white"><SelectValue>{(v: string) => BC_COLORS.find((c) => String(c.id) === v)?.label ?? v}</SelectValue></SelectTrigger>
              <SelectContent>
                {BC_COLORS.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!comboOk && (
              <p className="text-xs text-amber-600">This paper doesn&apos;t support that side option. Pick a different paper or sides.</p>
            )}
          </div>

          <div className="space-y-1.5 rounded-lg border border-kc-border bg-kc-bg p-3">
            <Label>Quantity</Label>
            <Select value={String(spec.quantity)} onValueChange={(v) => v && set("quantity", Number(v))} disabled={quantities.length === 0}>
              <SelectTrigger className="bg-white"><SelectValue>{(v: string) => `${formatQuantity(Number(v))} cards`}</SelectValue></SelectTrigger>
              <SelectContent>
                {quantities.map((q) => (
                  <SelectItem key={q} value={String(q)}>{formatQuantity(q)} cards</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Price, front and center right after quantity — the add-ons below only ever add a
            small line to this same total, so they shouldn't need their own competing summary. */}
        <div className="mt-5 border-t border-kc-border pt-4">
          {price.valid ? (
            <>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-kc-muted">Print Total</div>
                  <div className="text-xs text-kc-muted">{formatQuantity(spec.quantity)} cards</div>
                </div>
                <div className="text-3xl font-black text-kc-magenta-deep">{formatDollars(price.total)}</div>
              </div>
              {hasAddOns && (
                <div className="mt-3 space-y-1 border-t border-dashed border-kc-border pt-3 text-xs text-kc-muted">
                  <div className="flex justify-between"><span>Base printing</span><span>{formatDollars(price.basePrice)}</span></div>
                  {price.rushSurcharge > 0 && <div className="flex justify-between"><span>Rush turnaround</span><span>+{formatDollars(price.rushSurcharge)}</span></div>}
                  {price.roundCornersPrice > 0 && <div className="flex justify-between"><span>Round corners</span><span>+{formatDollars(price.roundCornersPrice)}</span></div>}
                  {price.proofPrice > 0 && <div className="flex justify-between"><span>Manual proof</span><span>+{formatDollars(price.proofPrice)}</span></div>}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-amber-600">{price.error ?? "Select a valid combination to see pricing."}</p>
          )}
        </div>
      </div>

      {/* Add-ons: kept plain and low-key on purpose — these are optional extras, not a second
          set of decisions competing with size/paper/sides/quantity above. */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-kc-muted">Optional add-ons</p>
        <div className="divide-y divide-kc-border overflow-hidden rounded-lg border border-kc-border">
          <label className={`flex items-center justify-between gap-3 p-3 ${spec.quantity > RUSH_MAX_QUANTITY ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-kc-bg"}`}>
            <span className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={spec.rush}
                disabled={spec.quantity > RUSH_MAX_QUANTITY}
                onChange={() => set("rush", !spec.rush)}
                className="h-4 w-4 shrink-0 accent-kc-coral"
              />
              <span>
                <span className="block text-sm text-kc-dark">Rush Turnaround</span>
                <span className="block text-xs text-kc-muted">
                  {spec.quantity > RUSH_MAX_QUANTITY ? `Only available up to ${formatQuantity(RUSH_MAX_QUANTITY)} cards.` : "Faster production."}
                </span>
              </span>
            </span>
            {price.valid && spec.rush && <span className="shrink-0 text-xs text-kc-muted">+{formatDollars(price.rushSurcharge)}</span>}
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-3 p-3 hover:bg-kc-bg">
            <span className="flex items-center gap-2.5">
              <input type="checkbox" checked={spec.roundCorners} onChange={() => set("roundCorners", !spec.roundCorners)} className="h-4 w-4 shrink-0 accent-kc-coral" />
              <span>
                <span className="block text-sm text-kc-dark">Round Corners</span>
                <span className="block text-xs text-kc-muted">A softer, more premium edge.</span>
              </span>
            </span>
            {price.valid && spec.roundCorners && <span className="shrink-0 text-xs text-kc-muted">+{formatDollars(price.roundCornersPrice)}</span>}
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-3 p-3 hover:bg-kc-bg">
            <span className="flex items-center gap-2.5">
              <input type="checkbox" checked={spec.manualProof} onChange={() => set("manualProof", !spec.manualProof)} className="h-4 w-4 shrink-0 accent-kc-coral" />
              <span>
                <span className="block text-sm text-kc-dark">Manual Proof Review</span>
                <span className="block text-xs text-kc-muted">A person checks your file before print (24 hrs). Instant automated proofing is free and used by default.</span>
              </span>
            </span>
            {spec.manualProof && <span className="shrink-0 text-xs text-kc-muted">+{formatDollars(3)}</span>}
          </label>
        </div>
      </div>
    </div>
  );
}
