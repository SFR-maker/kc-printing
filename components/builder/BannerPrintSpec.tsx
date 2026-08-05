"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDollars } from "@/lib/utils";
import {
  BANNER_MATERIALS, BANNER_QUANTITIES, BANNER_SIZES, areaSqFt, calculateBannerPrice,
} from "@/lib/pricing/banners";
import { bannerParcel } from "@/lib/shipping/banner-parcel";
import { formatWeight } from "@/lib/shipping/parcel";

export interface BannerSpec {
  size: string;
  material: string;
  quantity: number;
}

export const DEFAULT_BANNER_SPEC: BannerSpec = {
  // The commonest storefront banner, on the standard scrim.
  size: "3 ft x 6 ft",
  material: "13 oz. Premium Scrim Glossy Vinyl",
  quantity: 1,
};

/**
 * Size, material and quantity for a banner, priced from figures quoted by the supplier.
 *
 * Only the quantities that were actually priced are offered. Interpolating between breaks was
 * measured against a full 41-point curve and came out up to 12% under the real cost, which with
 * print sold at cost is a straight loss on the order.
 */
export function BannerPrintSpec({
  spec,
  onChange,
}: {
  spec: BannerSpec;
  onChange: (next: BannerSpec) => void;
}) {
  const price = calculateBannerPrice(spec);
  const parcel = bannerParcel(spec.size, spec.material, spec.quantity);

  function set<K extends keyof BannerSpec>(key: K, value: BannerSpec[K]) {
    onChange({ ...spec, [key]: value });
  }

  return (
    <div className="rounded-xl border-2 border-kc-coral/40 p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-kc-border p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">Size</Label>
          <Select value={spec.size} onValueChange={(v) => v && set("size", v)}>
            <SelectTrigger className="border-kc-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BANNER_SIZES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label} <span className="text-kc-muted">· {areaSqFt(s.label)} sq ft</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-kc-border p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">Material</Label>
          <Select value={spec.material} onValueChange={(v) => v && set("material", v)}>
            <SelectTrigger className="border-kc-border"><SelectValue /></SelectTrigger>
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
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">Quantity</Label>
          <Select value={String(spec.quantity)} onValueChange={(v) => v && set("quantity", Number(v))}>
            <SelectTrigger className="border-kc-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BANNER_QUANTITIES.map((q) => (
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
          <p className="text-xs text-kc-muted">{formatWeight(parcel.weightOz)} · hemmed with grommets</p>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between border-t border-kc-border pt-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-kc-muted">Print total</div>
          <div className="text-sm text-kc-muted">
            {spec.quantity === 1 ? "1 banner" : `${spec.quantity} banners`}, {spec.size}
          </div>
        </div>
        {price.valid ? (
          <div className="text-3xl font-black text-kc-magenta-deep">{formatDollars(price.total)}</div>
        ) : (
          <p className="max-w-xs text-right text-sm text-amber-600">{price.error}</p>
        )}
      </div>
    </div>
  );
}
