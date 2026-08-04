"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateBusinessCardPrice } from "@/lib/pricing/business-cards";
import { DEFAULT_PRICING, PRICING_KEYS, PRICING_LIMITS, type PricingSettings } from "@/lib/pricing/settings";
import type { ShippingTier } from "@/lib/shipping/rates";
import { formatDollars } from "@/lib/utils";

/** A representative order, so the effect of a markup change is visible before it is saved. */
const PREVIEW_SPEC = { sizeId: 101, paperId: 7, colorId: 1, quantity: 250, rush: false, roundCorners: false, manualProof: false };

export function AdminPrintPricing({ settings }: { settings: PricingSettings }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const [markup, setMarkup] = useState(String(settings.markupMultiplier));
  const [cornerMarkup, setCornerMarkup] = useState(String(settings.roundCornersMarkup));
  const [proofPrice, setProofPrice] = useState(String(settings.manualProofPrice));
  const [tiers, setTiers] = useState<ShippingTier[]>(settings.shippingTiers);
  const [shipMarkup, setShipMarkup] = useState(String(settings.shippingMarkup));

  async function put(section: string, key: string, value: string) {
    setBusy(section);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "That didn't save.");
        return;
      }
      setSaved(section);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(null);
    }
  }

  // Priced live from what is currently typed, so the owner sees the customer's number rather than a
  // multiplier. A margin is abstract; "$21.00 becomes $25.20" is not.
  const previewMarkup = Number(markup);
  const preview = Number.isFinite(previewMarkup) && previewMarkup >= PRICING_LIMITS.markupMultiplier.min
    ? calculateBusinessCardPrice(PREVIEW_SPEC, { ...DEFAULT_PRICING, markupMultiplier: previewMarkup })
    : null;
  const atCost = calculateBusinessCardPrice(PREVIEW_SPEC, { ...DEFAULT_PRICING, markupMultiplier: 1 });

  const tiersChanged = JSON.stringify(tiers) !== JSON.stringify(settings.shippingTiers);
  const tiersValid = tiers.length > 0
    && tiers.every((t) => t.label.trim() && t.price >= 0 && t.minBusinessDays >= 1 && t.minBusinessDays <= t.maxBusinessDays)
    && tiers.filter((t) => t.recommended).length <= 1;

  return (
    <div className="space-y-5">
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <Card className="border-kc-border">
        <CardContent className="space-y-4 p-5">
          <div>
            <h2 className="font-bold text-kc-dark">Print margin</h2>
            <p className="mt-1 text-sm leading-relaxed text-kc-muted">
              Your supplier&apos;s cost table is fixed. This is what you multiply it by to get the price a
              customer pays. 1.25 means a 25% margin.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-kc-muted">Print markup</Label>
              <Input
                type="number" step="0.01" min={PRICING_LIMITS.markupMultiplier.min} max={PRICING_LIMITS.markupMultiplier.max}
                value={markup} onChange={(e) => setMarkup(e.target.value)} className="border-kc-border"
              />
            </div>
            <div className="rounded-lg border border-kc-border bg-kc-bg p-3">
              <p className="text-xs uppercase tracking-wide text-kc-muted">250 cards, matte, single sided</p>
              <p className="mt-1 text-lg font-black text-kc-dark">
                {preview ? formatDollars(preview.total) : "—"}
              </p>
              <p className="text-xs text-kc-muted">
                costs you {formatDollars(atCost.total)}
                {preview && preview.total > atCost.total
                  ? ` · you keep ${formatDollars(preview.total - atCost.total)}`
                  : ""}
              </p>
            </div>
          </div>

          <Button
            onClick={() => put("markup", PRICING_KEYS.markupMultiplier, markup)}
            disabled={busy !== null || markup === String(settings.markupMultiplier) || !preview}
            className="bg-kc-teal text-white hover:bg-kc-teal/90"
          >
            {busy === "markup" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save markup"}
          </Button>
          {saved === "markup" && <span className="ml-3 text-sm text-emerald-700">Saved. Live on the site now.</span>}
        </CardContent>
      </Card>

      <Card className="border-kc-border">
        <CardContent className="space-y-4 p-5">
          <div>
            <h2 className="font-bold text-kc-dark">Add-on fees</h2>
            <p className="mt-1 text-sm text-kc-muted">Charged on top of the print price when the customer selects them.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-kc-muted">Rounded corners markup</Label>
              <Input
                type="number" step="0.01" min={PRICING_LIMITS.roundCornersMarkup.min} max={PRICING_LIMITS.roundCornersMarkup.max}
                value={cornerMarkup} onChange={(e) => setCornerMarkup(e.target.value)} className="border-kc-border"
              />
              <p className="text-xs text-kc-muted">Applied to the die-cut cost, same idea as the print markup.</p>
              <Button
                size="sm"
                onClick={() => put("corners", PRICING_KEYS.roundCornersMarkup, cornerMarkup)}
                disabled={busy !== null || cornerMarkup === String(settings.roundCornersMarkup)}
                className="bg-kc-teal text-white hover:bg-kc-teal/90"
              >
                {busy === "corners" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-kc-muted">Manual proof fee ($)</Label>
              <Input
                type="number" step="0.5" min={PRICING_LIMITS.manualProofPrice.min} max={PRICING_LIMITS.manualProofPrice.max}
                value={proofPrice} onChange={(e) => setProofPrice(e.target.value)} className="border-kc-border"
              />
              <p className="text-xs text-kc-muted">Flat fee for a human-checked proof. The instant proof stays free.</p>
              <Button
                size="sm"
                onClick={() => put("proof", PRICING_KEYS.manualProofPrice, proofPrice)}
                disabled={busy !== null || proofPrice === String(settings.manualProofPrice)}
                className="bg-kc-teal text-white hover:bg-kc-teal/90"
              >
                {busy === "proof" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-kc-border">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-kc-dark">Shipping speeds</h2>
              <p className="mt-1 text-sm text-kc-muted">
                Flat rates offered at checkout. Transit days are business days after despatch, and exclude
                production time.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-kc-muted">Handling added to each live carrier rate ($)</Label>
              <div className="flex gap-2">
                <Input
                  type="number" step="0.5" min={PRICING_LIMITS.shippingMarkup.min} max={PRICING_LIMITS.shippingMarkup.max}
                  value={shipMarkup} onChange={(e) => setShipMarkup(e.target.value)}
                  className="max-w-[110px] border-kc-border"
                />
                <Button
                  size="sm"
                  onClick={() => put("shipmarkup", PRICING_KEYS.shippingMarkup, shipMarkup)}
                  disabled={busy !== null || shipMarkup === String(settings.shippingMarkup)}
                  className="bg-kc-teal text-white hover:bg-kc-teal/90"
                >
                  {busy === "shipmarkup" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
              <p className="text-xs text-kc-muted">
                Covers the box, tape, label and packing time — the carrier only prices the parcel.
              </p>
            </div>
            <Button size="sm" variant="outline" className="border-kc-border" onClick={() => setTiers(DEFAULT_PRICING.shippingTiers)}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} /> Reset to defaults
            </Button>
          </div>

          <div className="space-y-2">
            {tiers.map((tier, i) => (
              <div key={tier.id} className="grid items-end gap-2 rounded-lg border border-kc-border p-3 sm:grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_auto]">
                <Field label="Name">
                  <Input value={tier.label} onChange={(e) => update(i, { label: e.target.value })} className="border-kc-border" />
                </Field>
                <Field label="Price ($)">
                  <Input type="number" step="0.01" min={0} value={tier.price}
                    onChange={(e) => update(i, { price: Number(e.target.value) })} className="border-kc-border" />
                </Field>
                <Field label="Days min">
                  <Input type="number" min={1} value={tier.minBusinessDays}
                    onChange={(e) => update(i, { minBusinessDays: Number(e.target.value) })} className="border-kc-border" />
                </Field>
                <Field label="Days max">
                  <Input type="number" min={1} value={tier.maxBusinessDays}
                    onChange={(e) => update(i, { maxBusinessDays: Number(e.target.value) })} className="border-kc-border" />
                </Field>
                <div className="flex items-center gap-2 pb-1">
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-kc-muted">
                    <input
                      type="radio"
                      name="recommended"
                      checked={Boolean(tier.recommended)}
                      onChange={() => setTiers(tiers.map((t, j) => ({ ...t, recommended: i === j })))}
                      className="accent-kc-coral"
                    />
                    Default
                  </label>
                  <button
                    type="button"
                    onClick={() => setTiers(tiers.filter((_, j) => j !== i))}
                    disabled={tiers.length === 1}
                    className="text-kc-muted transition-colors hover:text-red-600 disabled:opacity-30"
                    aria-label={`Remove ${tier.label}`}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="border-kc-border"
              onClick={() =>
                setTiers([...tiers, { id: `tier-${Date.now()}`, label: "New speed", price: 9.95, minBusinessDays: 3, maxBusinessDays: 5 }])
              }
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} /> Add speed
            </Button>
            <Button
              onClick={() => put("shipping", PRICING_KEYS.shippingTiers, JSON.stringify(tiers))}
              disabled={busy !== null || !tiersChanged || !tiersValid}
              className="bg-kc-teal text-white hover:bg-kc-teal/90"
            >
              {busy === "shipping" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save shipping"}
            </Button>
            {saved === "shipping" && <span className="text-sm text-emerald-700">Saved.</span>}
            {!tiersValid && (
              <span className="text-sm text-amber-700">
                Every speed needs a name, and the minimum days cannot exceed the maximum.
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  function update(index: number, patch: Partial<ShippingTier>) {
    setTiers(tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wide text-kc-muted">{label}</Label>
      {children}
    </div>
  );
}
