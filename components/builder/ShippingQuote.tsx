"use client";

import { useState } from "react";
import { Loader2, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDollars } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface QuoteOption {
  id: string;
  label: string;
  transit: string;
  price: number;
  minDays: number;
  maxDays: number;
  recommended: boolean;
}

/**
 * Shipping priced before checkout.
 *
 * Stripe collects the delivery address on its own page, which is far too late to quote anything, so
 * the customer gives a ZIP here instead. A ZIP alone prices a parcel with every US carrier, and
 * asking for a full street address before someone has decided to buy costs more orders than the
 * precision is worth.
 *
 * Until a ZIP is entered no price is shown at all. Showing a number and then changing it is worse
 * than showing nothing: the first figure is the one people remember.
 */
export function ShippingQuote({
  spec,
  selected,
  onSelect,
  disabled,
}: {
  spec: { sizeId: number; paperId: number; quantity: number } | null;
  selected: QuoteOption | null;
  onSelect: (option: QuoteOption | null) => void;
  disabled?: boolean;
}) {
  const [zip, setZip] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<QuoteOption[] | null>(null);
  const [source, setSource] = useState<"live" | "flat" | null>(null);
  const [weight, setWeight] = useState<string | null>(null);

  async function quote() {
    if (!spec) return;
    setBusy(true);
    setError(null);
    onSelect(null);
    try {
      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zip, spec }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Couldn't price shipping to that ZIP.");
        setOptions(null);
        return;
      }
      setOptions(body.options);
      setSource(body.source);
      setWeight(body.weight);
      // Preselect the recommended option so a customer who ignores this still gets a sane rate.
      const rec = body.options.find((o: QuoteOption) => o.recommended) ?? body.options[0];
      if (rec) onSelect(rec);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-kc-border p-4">
      <div className="mb-1 flex items-baseline gap-2">
        <Truck className="h-4 w-4 shrink-0 text-kc-muted" strokeWidth={1.75} />
        <p className="text-sm font-semibold text-kc-dark">Shipping</p>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-kc-muted">
        Enter the ZIP you want this delivered to and we&apos;ll price it. You confirm the full address
        at payment.
      </p>

      <div className="flex gap-2">
        <Input
          value={zip}
          onChange={(e) => {
            setZip(e.target.value);
            setOptions(null);
            onSelect(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void quote();
            }
          }}
          placeholder="Delivery ZIP"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={10}
          aria-label="Delivery ZIP code"
          className="max-w-[150px] border-kc-border"
          disabled={disabled}
        />
        <Button
          type="button"
          onClick={quote}
          disabled={busy || disabled || !/^\d{5}/.test(zip) || !spec}
          variant="outline"
          className="border-kc-border"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : options ? "Re-check" : "Get rates"}
        </Button>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {options && (
        <>
          <ul className="mt-3 space-y-1.5">
            {options.map((o) => (
              <li key={o.id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 transition-colors",
                    selected?.id === o.id ? "border-kc-teal bg-kc-teal/5" : "border-kc-border hover:border-kc-teal/40"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="shipping-option"
                      checked={selected?.id === o.id}
                      onChange={() => onSelect(o)}
                      className="accent-kc-coral"
                    />
                    <span>
                      <span className="block text-sm font-medium text-kc-dark">{o.label}</span>
                      <span className="block text-xs text-kc-muted">{o.transit}</span>
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-sm font-semibold text-kc-dark">
                    {formatDollars(o.price)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-kc-muted">
            {source === "live"
              ? `Live carrier rates for a ${weight} parcel.`
              : `Flat rates — live carrier pricing isn't switched on yet. Parcel weighs about ${weight}.`}
          </p>
        </>
      )}
    </div>
  );
}
