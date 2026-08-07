"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDollars } from "@/lib/utils";
import {
  BANNER_MATERIALS, BANNER_SIZES, areaSqFt, bannerQuantitiesFor,
} from "@/lib/pricing/banners";
import { bannerParcel } from "@/lib/shipping/banner-parcel";
import { GROMMET_OPTIONS, DEFAULT_GROMMETS, HEMMING_INCLUDED, grommetNote } from "@/lib/pricing/banner-finishing";
import { useEffect, useRef, useState } from "react";
import { formatWeight } from "@/lib/shipping/parcel";

export interface BannerPriceState {
  valid: boolean;
  total: number;
  /** The grommet charge inside `total`, shown as its own line. */
  finishing: number;
  error?: string;
  loading: boolean;
}

export interface BannerSpec {
  size: string;
  material: string;
  quantity: number;
  /** Finishing. Hemming is included free on all four sides, so only grommets are chosen. */
  grommets: string;
}

export const DEFAULT_BANNER_SPEC: BannerSpec = {
  // The commonest storefront banner, on the standard scrim.
  size: "3 ft x 6 ft",
  material: "13 oz. Premium Scrim Glossy Vinyl",
  // One banner. Unlike cards or postcards, which sell in runs where any default would be a decision
  // made for the customer, a banner is usually bought singly - so one is a starting point rather
  // than an assumption.
  quantity: 1,
  // What most people actually want on an outdoor banner, and what the old copy silently promised.
  grommets: DEFAULT_GROMMETS,
};

/**
 * Size, material and quantity for a banner, priced from figures quoted by the supplier.
 *
 * Only the quantities that were actually priced are offered. Interpolating between breaks was
 * measured against a full 41-point curve and came out up to 12% under the real cost, which with
 * print sold at cost is a straight loss on the order.
 */
/**
 * Sizes bucketed by their short edge, in the order the supplier lists them.
 *
 * Computed once at module load rather than per render: it only depends on the catalogue.
 */
const sizeGroups: [string, typeof BANNER_SIZES][] = (() => {
  const groups = new Map<string, typeof BANNER_SIZES>();
  for (const s of BANNER_SIZES) {
    const short = s.label.match(/^([\d.]+)\s*ft/)?.[1] ?? "other";
    const key = short === "other" ? "Other sizes" : `${short} ft tall`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  return [...groups.entries()];
})();

export function BannerPrintSpec({
  spec,
  onChange,
  onPriceChange,
}: {
  spec: BannerSpec;
  onChange: (next: BannerSpec) => void;
  onPriceChange?: (price: BannerPriceState) => void;
}) {
  const [price, setPrice] = useState<BannerPriceState>({ valid: false, total: 0, finishing: 0, loading: true });
  const parcel = bannerParcel(spec.size, spec.material, spec.quantity);
  const quantities = bannerQuantitiesFor(spec.size, spec.material);

  const latest = useRef(0);
  useEffect(() => {
    // Each change supersedes the one before it, so a slow earlier reply cannot overwrite a newer
    // price with a stale one.
    const ticket = ++latest.current;
    const timer = setTimeout(async () => {
      // Marked loading inside the debounce rather than in the effect body: setting state
      // synchronously there cascades a render on every keystroke-speed change, and it also means a
      // quick change of mind never flashes "Pricing…" before the answer arrives.
      setPrice((prev) => ({ ...prev, loading: true }));
      try {
        const res = await fetch("/api/price/banners", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(spec),
        });
        const json = await res.json();
        if (ticket !== latest.current) return;
        setPrice({ valid: !!json.valid, total: Number(json.total) || 0, finishing: Number(json.finishing) || 0, error: json.error, loading: false });
      } catch {
        if (ticket !== latest.current) return;
        setPrice({ valid: false, total: 0, finishing: 0, error: "Could not reach pricing - please try again.", loading: false });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [spec.size, spec.material, spec.quantity, spec.grommets]);

  useEffect(() => { onPriceChange?.(price); }, [price, onPriceChange]);

  function set<K extends keyof BannerSpec>(key: K, value: BannerSpec[K]) {
    onChange({ ...spec, [key]: value });
  }

  return (
    <div className="rounded-xl border-2 border-kc-coral/40 p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-kc-border p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">Size</Label>
          <Select value={spec.size} onValueChange={(v) => v && set("size", v)}>
            <SelectTrigger aria-label="Size" className="border-kc-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {/* Grouped by the short edge. The supplier prints 110 sizes and a flat list of them is
                  unreadable; "3 ft" then its lengths is how someone actually looks for one. */}
              {sizeGroups.map(([group, sizes]) => (
                <SelectGroup key={group}>
                  <SelectLabel>{group}</SelectLabel>
                  {sizes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label} <span className="text-kc-muted">· {areaSqFt(s.label)} sq ft</span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-kc-border p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">Material</Label>
          <Select value={spec.material} onValueChange={(v) => v && set("material", v)}>
            <SelectTrigger aria-label="Material" className="border-kc-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BANNER_MATERIALS.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs leading-snug text-kc-muted">
            {/^8 oz/.test(spec.material)
              ? "Perforated mesh lets wind through — the right choice for a fence or an exposed wall."
              : /Matte/.test(spec.material)
                ? "Matte cuts glare, which reads better indoors and under direct light."
                : "Glossy scrim is the general-purpose choice, indoors or out."}
          </p>
        </div>

        <div className="rounded-lg border border-kc-border p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">Grommets</Label>
          <Select value={spec.grommets} onValueChange={(v) => v && set("grommets", v)}>
            <SelectTrigger aria-label="Grommets" className="border-kc-border"><SelectValue>{spec.grommets}</SelectValue></SelectTrigger>
            <SelectContent>
              {GROMMET_OPTIONS.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs leading-snug text-kc-muted">{grommetNote(spec.grommets)}</p>
        </div>

        <div className="rounded-lg border border-kc-border p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">Quantity</Label>
          <Select value={spec.quantity ? String(spec.quantity) : ""} onValueChange={(v) => v && set("quantity", Number(v))}>
            <SelectTrigger aria-label="Quantity" className="border-kc-border"><SelectValue placeholder="Choose a quantity" /></SelectTrigger>
            <SelectContent>
              {quantities.map((q) => (
                <SelectItem key={q} value={String(q)}>{q === 1 ? "1 banner" : `${q} banners`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-kc-border bg-kc-bg p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-kc-muted">Ships as</p>
          <p className="mt-1 text-sm text-kc-dark">
            {parcel.lengthIn}″ tube, {parcel.widthIn}″ across
          </p>
          <p className="text-xs text-kc-muted">{formatWeight(parcel.weightOz)} · {HEMMING_INCLUDED.toLowerCase()}, included</p>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between border-t border-kc-border pt-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-kc-muted">Print total</div>
          <div className="text-sm text-kc-muted">
            {spec.quantity === 1 ? "1 banner" : `${spec.quantity} banners`}, {spec.size}
          </div>
        </div>
        {price.loading ? (
          <div className="text-sm text-kc-muted">Pricing…</div>
        ) : price.valid ? (
          <div className="text-right">
            <div className="text-3xl font-black text-kc-magenta-deep">{formatDollars(price.total)}</div>
            {price.finishing > 0 && (
              <div className="text-xs text-kc-muted">
                includes {formatDollars(price.finishing)} for {spec.grommets.toLowerCase()}
              </div>
            )}
          </div>
        ) : (
          <p className="max-w-xs text-right text-sm text-amber-700">{price.error}</p>
        )}
      </div>
    </div>
  );
}
