"use client";

import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDollars } from "@/lib/utils";
import {
  RIGID_MATERIALS, type RigidMaterialId, type RigidSignSpec,
  colorsFor, materialLabel, quantitiesFor, repairRigidSpec, shapeLabel, shapesFor, sizeById, sizesFor,
  thicknessesFor, typesFor,
} from "@/lib/pricing/rigid-signs";

export interface RigidSignPriceState {
  valid: boolean;
  total: number;
  error?: string;
  loading: boolean;
}

/**
 * Material, shape, size, thickness, print sides and quantity for a rigid sign.
 *
 * Rigid signs are five separate supplier products sharing one storefront page, and their option sets
 * do not line up: foam alone is sold Premium or Economy, thickness is quoted in millimetres on three
 * of them and inches on foam, and no size id survives a change of material. Every change is
 * therefore repaired against what the supplier actually quotes rather than left on a combination
 * that cannot be priced.
 *
 * The price comes from the server. The five price tables are about two megabytes, so unlike banners
 * and postcards they are not bundled - see lib/pricing/rigid-signs.
 */
export function RigidSignPrintSpec({
  spec,
  onChange,
  onPriceChange,
}: {
  spec: RigidSignSpec;
  onChange: (next: RigidSignSpec) => void;
  onPriceChange?: (price: RigidSignPriceState) => void;
}) {
  const [price, setPrice] = useState<RigidSignPriceState>({ valid: false, total: 0, loading: true });

  const shapes = shapesFor(spec.material);
  const sizes = sizesFor(spec.material, spec.shapeId);
  const thicknesses = thicknessesFor(spec.material);
  const types = typesFor(spec.material);
  const colors = colorsFor(spec.material);
  const quantities = quantitiesFor(spec);
  const size = sizeById(spec.material, spec.sizeId);

  const latest = useRef(0);
  useEffect(() => {
    // Each change supersedes the one before it; a slow earlier reply must not overwrite a newer
    // price with a stale one.
    const ticket = ++latest.current;
    setPrice((p) => ({ ...p, loading: true }));
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/price/rigid-signs", {
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
  }, [spec.material, spec.sizeId, spec.shapeId, spec.thickness, spec.type, spec.color, spec.quantity]);

  useEffect(() => { onPriceChange?.(price); }, [price, onPriceChange]);

  function set<K extends keyof RigidSignSpec>(key: K, value: RigidSignSpec[K]) {
    // The previous spec is passed so a material change can keep a comparable size: size ids do not
    // carry across materials, so the old one has to be measured against the catalogue it came from.
    onChange(repairRigidSpec({ ...spec, [key]: value }, spec));
  }

  return (
    <div className="rounded-xl border-2 border-kc-coral/40 p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-kc-border p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">Material</Label>
          <Select value={spec.material} onValueChange={(v) => v && set("material", v as RigidMaterialId)}>
            <SelectTrigger aria-label="Material" className="border-kc-border"><SelectValue>{materialLabel(spec.material)}</SelectValue></SelectTrigger>
            <SelectContent>
              {RIGID_MATERIALS.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-kc-border p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">Shape</Label>
          <Select value={String(spec.shapeId)} onValueChange={(v) => v && set("shapeId", Number(v))}>
            <SelectTrigger aria-label="Shape" className="border-kc-border"><SelectValue>{shapeLabel(spec.material, spec.shapeId)}</SelectValue></SelectTrigger>
            <SelectContent>
              {shapes.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-kc-border p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">Size</Label>
          <Select value={String(spec.sizeId)} onValueChange={(v) => v && set("sizeId", Number(v))}>
            <SelectTrigger aria-label="Size" className="border-kc-border"><SelectValue>{size?.label ?? ""}</SelectValue></SelectTrigger>
            <SelectContent>
              {sizes.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-kc-border p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">Thickness</Label>
          <Select value={spec.thickness} onValueChange={(v) => v && set("thickness", v)}>
            <SelectTrigger aria-label="Thickness" className="border-kc-border"><SelectValue>{thicknesses.find((t) => t.value === spec.thickness)?.label ?? ""}</SelectValue></SelectTrigger>
            <SelectContent>
              {thicknesses.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {thicknesses.length === 1 && (
            <p className="mt-2 text-xs text-kc-muted">This material comes in one thickness.</p>
          )}
        </div>

        {types.length > 0 && (
          <div className="rounded-lg border border-kc-border p-4">
            <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">Grade</Label>
            <Select value={spec.type} onValueChange={(v) => v && set("type", v)}>
              <SelectTrigger aria-label="Grade" className="border-kc-border"><SelectValue>{types.find((t) => t.value === spec.type)?.label ?? ""}</SelectValue></SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs leading-snug text-kc-muted">
              Premium holds a flatter face for indoor display; Economy is the better buy for short-term outdoor use.
            </p>
          </div>
        )}

        <div className="rounded-lg border border-kc-border p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">Printed Sides</Label>
          <Select value={spec.color} onValueChange={(v) => v && set("color", v)}>
            <SelectTrigger aria-label="Printed Sides" className="border-kc-border"><SelectValue>{colors.find((c) => c.value === spec.color)?.label ?? ""}</SelectValue></SelectTrigger>
            <SelectContent>
              {colors.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-kc-border p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">Quantity</Label>
          <Select value={spec.quantity ? String(spec.quantity) : ""} onValueChange={(v) => v && set("quantity", Number(v))}>
            <SelectTrigger aria-label="Quantity" className="border-kc-border"><SelectValue placeholder="Choose a quantity">{spec.quantity ? (spec.quantity === 1 ? "1 sign" : `${spec.quantity.toLocaleString("en-US")} signs`) : undefined}</SelectValue></SelectTrigger>
            <SelectContent>
              {quantities.map((q) => (
                <SelectItem key={q} value={String(q)}>{q === 1 ? "1 sign" : `${q.toLocaleString("en-US")} signs`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between border-t border-kc-border pt-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-kc-muted">Print total</div>
          <div className="text-sm text-kc-muted">
            {spec.quantity === 1 ? "1 sign" : `${spec.quantity.toLocaleString("en-US")} signs`}
            {size ? `, ${size.label}` : ""}
          </div>
          {size && (
            <div className="text-xs text-kc-muted">
              Artwork at {size.dpi} DPI · finished {size.trimWidthIn}″ × {size.trimHeightIn}″
            </div>
          )}
        </div>
        {price.loading ? (
          <div className="text-sm text-kc-muted">Pricing…</div>
        ) : price.valid ? (
          <div className="text-3xl font-black text-kc-magenta-deep">{formatDollars(price.total)}</div>
        ) : (
          <p className="max-w-xs text-right text-sm text-amber-700">{price.error}</p>
        )}
      </div>
    </div>
  );
}
