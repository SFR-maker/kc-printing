"use client";

import { useEffect, useRef, useState } from "react";
import { OptionGroup, type Option } from "@/components/builder/OptionGroup";
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

/** Plainer wording than the supplier's "Full Color Front, No Back". */
const SIDES_LABEL: Record<string, string> = {
  "1": "Front only",
  "3": "Both sides",
};

/**
 * Material, shape, size, thickness, print sides and quantity for a rigid sign.
 *
 * Rigid signs are five separate supplier products sharing one storefront page, and their option sets
 * do not line up: foam alone is sold Premium or Economy, thickness is quoted in millimetres on three
 * of them and inches on foam, and no size id survives a change of material. Every change is
 * therefore repaired against what the supplier actually quotes rather than left on a combination
 * that cannot be priced.
 *
 * The price comes from the server - the five tables are about two megabytes and are deliberately not
 * bundled (see lib/pricing/rigid-signs) - and it is displayed by the order summary panel rather than
 * here, so the customer sees one total rather than two.
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

  const unit = (n: number) => (n === 1 ? "1 sign" : `${n.toLocaleString("en-US")} signs`);

  const materialOptions: Option[] = RIGID_MATERIALS.map((m) => ({ value: m.id, label: m.label }));
  const shapeOptions: Option[] = shapes.map((s) => ({ value: String(s.id), label: s.label }));
  const sizeOptions: Option[] = sizes.map((s) => ({ value: String(s.id), label: s.label }));
  const thicknessOptions: Option[] = thicknesses.map((t) => ({ value: t.value, label: t.label }));
  const typeOptions: Option[] = types.map((t) => ({ value: t.value, label: t.label }));
  const sidesOptions: Option[] = colors.map((c) => ({
    value: c.value,
    label: SIDES_LABEL[c.value] ?? c.label,
  }));
  const quantityOptions: Option[] = quantities.map((q) => ({ value: String(q), label: unit(q) }));

  return (
    <div className="space-y-5">
      <OptionGroup
        label="Material"
        options={materialOptions}
        value={spec.material}
        onChange={(v) => set("material", v as RigidMaterialId)}
        columns={3}
      />

      {/*
        Paired only where the options column is wide enough to be split. From `lg` the configurator
        is preview + options and that column is about 350px, so a second split gave each card ~79px
        and cut its own label in half; it returns at `xl`, where the column is ~530px. Same reason
        the business-card picker collapses its Size/Orientation pair across the same band.
      */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <OptionGroup
          label="Shape"
          options={shapeOptions}
          value={String(spec.shapeId)}
          onChange={(v) => set("shapeId", Number(v))}
          columns={2}
        />
        <OptionGroup
          label="Size"
          options={sizeOptions}
          value={String(spec.sizeId)}
          onChange={(v) => set("sizeId", Number(v))}
          columns={2}
          hint={sizes.length === 1 ? "This shape is cut in one size." : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <OptionGroup
          label="Thickness"
          options={thicknessOptions}
          value={spec.thickness}
          onChange={(v) => set("thickness", v)}
          columns={2}
          hint={thicknesses.length === 1 ? "This material comes in one thickness." : undefined}
        />
        <OptionGroup
          label="Printed sides"
          options={sidesOptions}
          value={spec.color}
          onChange={(v) => set("color", v)}
          columns={2}
        />
      </div>

      {types.length > 0 && (
        <OptionGroup
          label="Grade"
          options={typeOptions}
          value={spec.type}
          onChange={(v) => set("type", v)}
          columns={2}
          hint="Premium holds a flatter face for indoor display; Economy is the better buy for short-term outdoor use."
        />
      )}

      <OptionGroup
        label="Quantity"
        options={quantityOptions}
        value={spec.quantity ? String(spec.quantity) : ""}
        onChange={(v) => set("quantity", Number(v))}
      />

      {size && (
        <p className="border-t border-kc-border pt-4 text-xs text-kc-muted">
          {materialLabel(spec.material)} · {shapeLabel(spec.material, spec.shapeId)} · artwork at{" "}
          {size.dpi} DPI · finished {size.trimWidthIn}″ × {size.trimHeightIn}″
        </p>
      )}
    </div>
  );
}
