import catalogue from "./rigid-signs-catalogue.json";

/**
 * The options a customer chooses between when ordering a rigid sign.
 *
 * Rigid signs are five products rather than one - yard signs plus corrugated, PVC, foam and
 * aluminium boards - priced by two different supplier APIs and normalised here into a single shape.
 *
 * Prices are deliberately absent. The five price tables come to roughly two megabytes, which cannot
 * ship to a browser, so quoting happens server-side through /api/price/rigid-signs and this module
 * carries only the 61 KB of labels and dimensions the form needs. See lib/pricing/rigid-signs-server.
 *
 * Every size/shape pair listed here was actually quoted by the supplier. Shapes are not
 * interchangeable across sizes - a Star exists in a handful of sizes and an Arrow carries its own
 * size ids at its own prices - so pairs are enumerated rather than assumed to be a grid.
 */

export type RigidMaterialId =
  | "yard-signs" | "corrugated-boards" | "pvc-boards" | "foam-boards" | "aluminum-boards";

export interface RigidOption {
  value: string;
  label: string;
}

export interface RigidSize {
  id: number;
  label: string;
  widthIn: number;
  heightIn: number;
  /** The printable trim, a touch under the nominal size on boards. */
  trimWidthIn: number;
  trimHeightIn: number;
  dpi: number;
}

interface MaterialEntry {
  label: string;
  family: "yard" | "board";
  thicknesses: RigidOption[];
  types: RigidOption[];
  colors: RigidOption[];
  quantities: number[];
  shapes: { id: number; label: string }[];
  sizes: RigidSize[];
  pairs: [number, number][];
  /** Combinations offering fewer than the full quantity list, by combination key. */
  qtyCounts: Record<string, number>;
}

const data = catalogue as unknown as Record<RigidMaterialId, MaterialEntry>;

export interface RigidSignSpec {
  material: RigidMaterialId;
  sizeId: number;
  shapeId: number;
  /** Supplier thickness id; "-" where a product has only one. */
  thickness: string;
  /** Foam is sold Premium or Economy; empty for every other material. */
  type: string;
  /** 1 prints the front only, 3 prints both sides. */
  color: string;
  quantity: number;
}

export const RIGID_MATERIALS: { id: RigidMaterialId; label: string }[] =
  (Object.keys(data) as RigidMaterialId[]).map((id) => ({ id, label: data[id].label }));

const entry = (m: RigidMaterialId) => data[m];

export function shapesFor(m: RigidMaterialId): { id: number; label: string }[] {
  return entry(m)?.shapes ?? [];
}

/**
 * Sizes made in a given shape.
 *
 * Size ids are shape-specific: an 18" x 24" rectangle and an 18" x 24" arrow are different products
 * at different prices, and share only a label. Filtering by the quoted pairs keeps the two apart.
 */
export function sizesFor(m: RigidMaterialId, shapeId: number): RigidSize[] {
  const e = entry(m);
  if (!e) return [];
  const ok = new Set(e.pairs.filter(([, sh]) => sh === shapeId).map(([sz]) => sz));
  return e.sizes.filter((s) => ok.has(s.id));
}

export function thicknessesFor(m: RigidMaterialId): RigidOption[] {
  return entry(m)?.thicknesses ?? [];
}

/** Empty for everything except foam, which is sold Premium or Economy. */
export function typesFor(m: RigidMaterialId): RigidOption[] {
  return entry(m)?.types ?? [];
}

export function colorsFor(m: RigidMaterialId): RigidOption[] {
  return entry(m)?.colors ?? [];
}

/**
 * Quantity breaks available for a specific configuration.
 *
 * Availability is per-combination, not per-material: a 5" x 18" yard sign printed both sides stops
 * well short of the quantities its front-only twin reaches. Offering the material's whole list
 * everywhere advertised 2,399 combinations the supplier will not quote. Every combination supports
 * a prefix of the list, so the stored count says exactly where it stops.
 */
export function quantitiesFor(spec: Omit<RigidSignSpec, "quantity">): number[] {
  const e = entry(spec.material);
  if (!e) return [];
  const combo = comboKey(spec);
  const n = e.qtyCounts[combo];
  return n === undefined ? e.quantities : e.quantities.slice(0, n);
}

/** The configuration without its quantity - the unit availability is recorded against. */
function comboKey(spec: Omit<RigidSignSpec, "quantity">): string {
  return entry(spec.material)?.family === "yard"
    ? [spec.sizeId, spec.shapeId, spec.thickness, spec.color].join("|")
    : [spec.sizeId, spec.shapeId, spec.thickness, spec.type || "-", spec.color].join("|");
}

export function sizeById(m: RigidMaterialId, sizeId: number): RigidSize | null {
  return entry(m)?.sizes.find((s) => s.id === sizeId) ?? null;
}

export function materialLabel(m: RigidMaterialId): string {
  return entry(m)?.label ?? m;
}

export function shapeLabel(m: RigidMaterialId, shapeId: number): string {
  return entry(m)?.shapes.find((s) => s.id === shapeId)?.label ?? "";
}

/** True when the chosen print option puts artwork on the back as well as the front. */
export function rigidNeedsBack(color: string): boolean {
  return color === "3";
}

export function rigidBackLabel(): string {
  return "Back (full colour)";
}

/** A sensible opening configuration: the commonest sign a shop sells. */
export function defaultRigidSpec(m: RigidMaterialId = "yard-signs"): RigidSignSpec {
  const e = entry(m);
  const shape = e.shapes.find((s) => /^Rectangle$/i.test(s.label)) ?? e.shapes[0];
  const sizes = sizesFor(m, shape.id);
  const size = sizes.find((s) => /18" x 24"/.test(s.label)) ?? sizes[Math.floor(sizes.length / 2)] ?? sizes[0];
  // Repaired rather than assumed valid: 25 is a natural default but not every configuration offers
  // it, and the quantity a combination supports depends on all the choices above it.
  return repairRigidSpec({
    material: m,
    shapeId: shape.id,
    sizeId: size.id,
    thickness: e.thicknesses[0]?.value ?? "-",
    type: e.types[0]?.value ?? "",
    color: e.colors[0]?.value ?? "1",
    // 0 means not chosen: quantity is a required choice, not a default run length.
    quantity: 0,
  });
}

/**
 * Repairs a spec after a change that invalidates the rest of it.
 *
 * Switching material replaces the entire option set - foam has a Type control nothing else has,
 * thicknesses are measured in millimetres on one product and inches on another, and no size id
 * survives the move. Without repair the form would sit on a combination that cannot be quoted.
 */
export function repairRigidSpec(next: RigidSignSpec, prev?: RigidSignSpec): RigidSignSpec {
  const e = entry(next.material);
  if (!e) return next;
  const out = { ...next };

  if (!e.shapes.some((s) => s.id === out.shapeId)) {
    out.shapeId = (e.shapes.find((s) => /^Rectangle$/i.test(s.label)) ?? e.shapes[0]).id;
  }
  const sizes = sizesFor(out.material, out.shapeId);
  if (sizes.length && !sizes.some((s) => s.id === out.sizeId)) {
    /**
     * Keep the closest area rather than snapping to the smallest, so changing shape or material does
     * not quietly shrink a 24" sign to an 8" one.
     *
     * The size being moved away from has to be resolved against the material it belonged to. Size
     * ids do not survive a change of material, so looking the old id up in the new catalogue finds
     * nothing and every material switch silently selected the smallest board on offer.
     */
    const from = prev ?? next;
    const want = sizeById(from.material, from.sizeId);
    const area = want ? want.widthIn * want.heightIn : 0;
    out.sizeId = area
      ? sizes.reduce((a, b) => (Math.abs(b.widthIn * b.heightIn - area) < Math.abs(a.widthIn * a.heightIn - area) ? b : a), sizes[0]).id
      : sizes[0].id;
  }
  if (!e.thicknesses.some((t) => t.value === out.thickness)) out.thickness = e.thicknesses[0]?.value ?? "-";
  if (e.types.length) {
    if (!e.types.some((t) => t.value === out.type)) out.type = e.types[0].value;
  } else {
    out.type = "";
  }
  if (!e.colors.some((c) => c.value === out.color)) out.color = e.colors[0]?.value ?? "1";

  // Quantity last, because which breaks exist depends on everything repaired above.
  const qs = quantitiesFor(out);
  // 0 is "not chosen" and must survive repair, or changing any other control would silently pick a
  // run length for the customer.
  if (out.quantity !== 0 && qs.length && !qs.includes(out.quantity)) {
    out.quantity = qs.reduce((a, b) => (Math.abs(b - out.quantity) < Math.abs(a - out.quantity) ? b : a), qs[0]);
  }
  return out;
}

/** The key a price is stored under, shared with the server so the two cannot drift apart. */
export function rigidPriceKey(spec: RigidSignSpec): string {
  return entry(spec.material)?.family === "yard"
    ? [spec.sizeId, spec.shapeId, spec.thickness, spec.color, spec.quantity].join("|")
    : [spec.sizeId, spec.shapeId, spec.thickness, spec.type || "-", spec.color, spec.quantity].join("|");
}
