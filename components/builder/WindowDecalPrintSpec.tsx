"use client";

import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  WINDOW_MATERIALS, type WindowMaterialId, type WindowDecalSpec,
  materialFilm, materialLabel, quantitiesFor, repairWindowDecalSpec, shapeLabel, shapesFor, sizeById, sizesFor,
} from "@/lib/pricing/window-decals";

export interface WindowDecalPriceState {
  valid: boolean;
  total: number;
  error?: string;
  loading: boolean;
}

/**
 * Film, shape, size and quantity for window signage.
 *
 * Three supplier products share this one page - decals, clings and perfs - and unlike rigid signs
 * their option sets line up exactly: the same 117 sizes in the same 11 shapes, differing only in
 * what the graphic is printed on. So the film is the first choice and nothing below it has to move
 * when it changes. Changes are still repaired against what the supplier quotes, because shape does
 * replace the whole size list beneath it.
 *
 * The price comes from the server. The three tables hold 14,391 quotes and are not bundled - see
 * lib/pricing/window-decals.
 */
export function WindowDecalPrintSpec({
  spec,
  onChange,
  onPriceChange,
}: {
  spec: WindowDecalSpec;
  onChange: (next: WindowDecalSpec) => void;
  onPriceChange?: (price: WindowDecalPriceState) => void;
}) {
  const [price, setPrice] = useState<WindowDecalPriceState>({ valid: false, total: 0, loading: true });

  const shapes = shapesFor(spec.material);
  const sizes = sizesFor(spec.material, spec.shapeId);
  const quantities = quantitiesFor(spec);
  const size = sizeById(spec.material, spec.sizeId);

  const latest = useRef(0);
  useEffect(() => {
    // Each change supersedes the one before it; a slow earlier reply must not overwrite a newer
    // price with a stale one.
    const ticket = ++latest.current;

    const timer = setTimeout(async () => {
      /*
       * Nothing is asked of the server until a quantity has been chosen.
       *
       * The route answers 400 for a quantity of 0 - correctly, it is not a quotable request - but
       * firing it anyway put a red 400 in the console of every freshly opened order page. The client
       * already knows the selection is incomplete, so it says so itself.
       *
       * Inside the debounce rather than in the effect body: setting state synchronously there
       * cascades a render on every change.
       */
      if (!spec.quantity) {
        setPrice({ valid: false, total: 0, error: "Choose a quantity to see your price.", loading: false });
        return;
      }

      // Marked loading inside the debounce rather than in the effect body, so a quick change of mind
      // never flashes "Pricing…" before the answer arrives.
      setPrice((prev) => ({ ...prev, loading: true }));
      try {
        const res = await fetch("/api/price/window-decals", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(spec),
        });
        const json = await res.json();
        if (ticket !== latest.current) return;
        setPrice({ valid: !!json.valid, total: Number(json.total) || 0, error: json.error, loading: false });
      } catch {
        if (ticket !== latest.current) return;
        setPrice({ valid: false, total: 0, error: "Could not reach pricing - please try again.", loading: false });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [spec.material, spec.sizeId, spec.shapeId, spec.quantity]);

  useEffect(() => { onPriceChange?.(price); }, [price, onPriceChange]);

  function set<K extends keyof WindowDecalSpec>(key: K, value: WindowDecalSpec[K]) {
    // The previous spec is passed so a change of film can keep a comparable size, the same way the
    // rigid-sign picker preserves area across a change of material.
    onChange(repairWindowDecalSpec({ ...spec, [key]: value }, spec));
  }

  const unit = (n: number) => (n === 1 ? "1 decal" : `${n.toLocaleString("en-US")} decals`);

  return (
    <div className="rounded-xl border-2 border-kc-coral/40 p-5">
      {/*
        One column while the options column is narrow, two again at `xl`, and every cell and trigger
        told it may be narrower than its own text.

        From `lg` this grid lives in about 350px, so two columns left each select ~168px to hold
        "Perforated Window Vinyl" or a 23.6″ × 23.6″ size label. A select trigger is `w-fit
        whitespace-nowrap` and a grid item defaults to min-width: auto, so neither would truncate -
        the control grew, its track grew, and the document scrolled sideways. See the banner picker,
        which had the same fault and the same fix.
      */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-kc-border p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">Film</Label>
          <Select value={spec.material} onValueChange={(v) => v && set("material", v as WindowMaterialId)}>
            <SelectTrigger aria-label="Film" className="w-full min-w-0 border-kc-border"><SelectValue>{materialLabel(spec.material)}</SelectValue></SelectTrigger>
            <SelectContent>
              {WINDOW_MATERIALS.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs leading-snug text-kc-muted">
            {WINDOW_MATERIALS.find((m) => m.id === spec.material)?.blurb}
          </p>
        </div>

        <div className="min-w-0 rounded-lg border border-kc-border p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">Shape</Label>
          <Select value={String(spec.shapeId)} onValueChange={(v) => v && set("shapeId", Number(v))}>
            <SelectTrigger aria-label="Shape" className="w-full min-w-0 border-kc-border"><SelectValue>{shapeLabel(spec.material, spec.shapeId)}</SelectValue></SelectTrigger>
            <SelectContent>
              {shapes.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 rounded-lg border border-kc-border p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">Size</Label>
          <Select value={String(spec.sizeId)} onValueChange={(v) => v && set("sizeId", Number(v))}>
            <SelectTrigger aria-label="Size" className="w-full min-w-0 border-kc-border"><SelectValue>{size?.label ?? ""}</SelectValue></SelectTrigger>
            <SelectContent>
              {sizes.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {sizes.length === 1 && (
            <p className="mt-2 text-xs text-kc-muted">This shape is cut in one size.</p>
          )}
        </div>

        <div className="min-w-0 rounded-lg border border-kc-border p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">Quantity</Label>
          <Select value={spec.quantity ? String(spec.quantity) : ""} onValueChange={(v) => v && set("quantity", Number(v))}>
            <SelectTrigger aria-label="Quantity" className="w-full min-w-0 border-kc-border">
              <SelectValue placeholder="Choose a quantity">{spec.quantity ? unit(spec.quantity) : undefined}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {quantities.map((q) => (
                <SelectItem key={q} value={String(q)}>{unit(q)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/*
        The print specification, but not the price.

        The running total lives in the order summary panel, which is on screen the whole time. This
        block used to carry its own total and its own "choose a quantity" prompt, so a customer saw
        the same figure and the same warning twice on one screen and had to work out whether they
        were the same thing.
      */}
      {size && (
        <p className="mt-4 border-t border-kc-border pt-4 text-xs text-kc-muted">
          {materialFilm(spec.material)} · artwork at {size.dpi} DPI · finished {size.trimWidthIn}″ × {size.trimHeightIn}″
        </p>
      )}
    </div>
  );
}
