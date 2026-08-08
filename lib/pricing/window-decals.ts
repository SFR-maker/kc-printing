import catalogue from "./window-decals-catalogue.json";

/**
 * The options a customer chooses between when ordering window signage.
 *
 * Window signage is three products rather than one - decals, clings and perfs - which GotPrint sells
 * as three separate product types on three separate price tables, normalised here into one shape.
 * They differ only in the film they are printed on, so a customer picks the film first and every
 * other option is identical across the three.
 *
 * Prices are deliberately absent. The three price tables hold 14,391 quotes; quoting happens
 * server-side through /api/price/window-decals and this module carries only the 51 KB of labels and
 * dimensions the form needs. See lib/pricing/window-decals-server.
 *
 * Unlike rigid signs there is no thickness, no Premium/Economy type and one print option: the film
 * is printed on the face and applied to glass, so "both sides" is not a thing that exists.
 */

export type WindowMaterialId = "window-decals" | "window-clings" | "window-perfs";

export interface WindowSize {
  id: number;
  /** The shape this size is cut to. A size belongs to exactly one shape. */
  shapeId: number;
  label: string;
  widthIn: number;
  heightIn: number;
  /** The printable trim, a touch under the nominal size. */
  trimWidthIn: number;
  trimHeightIn: number;
  dpi: number;
  orientationId: number;
}

interface MaterialEntry {
  label: string;
  blurb: string;
  /** The film, as the supplier describes it - "3 mil Adhesive Vinyl". */
  material: string;
  paper: string;
  color: string;
  shapes: { id: number; label: string }[];
  sizes: WindowSize[];
  quantities: number[];
  /** Combinations offering fewer than the full quantity list, by `sizeId|shapeId`. */
  qtyCounts: Record<string, number>;
}

const data = catalogue as unknown as Record<WindowMaterialId, MaterialEntry>;

export interface WindowDecalSpec {
  material: WindowMaterialId;
  sizeId: number;
  shapeId: number;
  quantity: number;
}

export const WINDOW_MATERIALS: { id: WindowMaterialId; label: string; blurb: string; film: string }[] =
  (Object.keys(data) as WindowMaterialId[]).map((id) => ({
    id,
    label: data[id].label,
    blurb: data[id].blurb,
    film: data[id].material,
  }));

const entry = (m: WindowMaterialId) => data[m];

export function shapesFor(m: WindowMaterialId): { id: number; label: string }[] {
  return entry(m)?.shapes ?? [];
}

/**
 * Sizes cut in a given shape.
 *
 * Size ids are shape-specific: a 24" x 6" Rectangle and a 24" x 6" Rounded Rectangle are different
 * products at different prices that share a label, so the two are kept apart by the shape recorded
 * on the size itself rather than by crossing every size with every shape.
 */
export function sizesFor(m: WindowMaterialId, shapeId: number): WindowSize[] {
  return entry(m)?.sizes.filter((s) => s.shapeId === shapeId) ?? [];
}

/**
 * Quantity breaks available for a specific configuration.
 *
 * Every window size currently quotes all 41 breaks, but availability is still read per combination
 * rather than assumed uniform - the rigid-sign catalogue looked uniform too until 2,399 combinations
 * turned out not to be, and an unavailable quantity fails after payment rather than before it.
 */
export function quantitiesFor(spec: Omit<WindowDecalSpec, "quantity">): number[] {
  const e = entry(spec.material);
  if (!e) return [];
  const n = e.qtyCounts[`${spec.sizeId}|${spec.shapeId}`];
  return n === undefined ? e.quantities : e.quantities.slice(0, n);
}

export function sizeById(m: WindowMaterialId, sizeId: number): WindowSize | null {
  return entry(m)?.sizes.find((s) => s.id === sizeId) ?? null;
}

export function materialLabel(m: WindowMaterialId): string {
  return entry(m)?.label ?? m;
}

/** The film the material is printed on, as the supplier describes it. */
export function materialFilm(m: WindowMaterialId): string {
  return entry(m)?.material ?? "";
}

export function shapeLabel(m: WindowMaterialId, shapeId: number): string {
  return entry(m)?.shapes.find((s) => s.id === shapeId)?.label ?? "";
}

/**
 * Window signage prints on one face only.
 *
 * Stated as a function rather than left implicit so the artwork step, the print pipeline and the
 * order summary all agree without each deciding for itself - the rigid-sign flow has the same
 * question and answers it from the chosen print option.
 */
export function windowNeedsBack(): boolean {
  return false;
}

/** A sensible opening configuration: the commonest window sign a shop sells. */
export function defaultWindowDecalSpec(m: WindowMaterialId = "window-decals"): WindowDecalSpec {
  const e = entry(m);
  const shape = e.shapes.find((s) => /^Rectangle$/i.test(s.label)) ?? e.shapes[0];
  const sizes = sizesFor(m, shape.id);
  const size = sizes.find((s) => /^24" x 18"$|^18" x 24"$/.test(s.label))
    ?? sizes[Math.floor(sizes.length / 2)]
    ?? sizes[0];
  return repairWindowDecalSpec({
    material: m,
    shapeId: shape.id,
    sizeId: size.id,
    // 0 means not chosen: quantity is a required choice, not a default run length.
    quantity: 0,
  });
}

/**
 * Repairs a spec after a change that invalidates the rest of it.
 *
 * Changing shape replaces the entire size list, and no size id survives the move. Without repair the
 * form would sit on a combination that cannot be quoted. Material is the one axis that does survive:
 * the three films are sold in the same 117 sizes under the same ids, but that is checked rather than
 * relied upon, so a future divergence degrades to the nearest size instead of a dead quote.
 */
export function repairWindowDecalSpec(next: WindowDecalSpec, prev?: WindowDecalSpec): WindowDecalSpec {
  const e = entry(next.material);
  if (!e) return next;
  const out = { ...next };

  if (!e.shapes.some((s) => s.id === out.shapeId)) {
    out.shapeId = (e.shapes.find((s) => /^Rectangle$/i.test(s.label)) ?? e.shapes[0]).id;
  }
  const sizes = sizesFor(out.material, out.shapeId);
  if (sizes.length && !sizes.some((s) => s.id === out.sizeId)) {
    /**
     * Keep the closest area rather than snapping to the smallest, so changing shape does not quietly
     * shrink a 30" decal to a 6" one. The size being moved away from is resolved against the
     * material it belonged to, since ids are not guaranteed to mean the same thing across materials.
     */
    const from = prev ?? next;
    const want = sizeById(from.material, from.sizeId);
    const area = want ? want.widthIn * want.heightIn : 0;
    out.sizeId = area
      ? sizes.reduce((a, b) => (Math.abs(b.widthIn * b.heightIn - area) < Math.abs(a.widthIn * a.heightIn - area) ? b : a), sizes[0]).id
      : sizes[0].id;
  }

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
export function windowDecalPriceKey(spec: WindowDecalSpec): string {
  return [spec.sizeId, spec.shapeId, spec.quantity].join("|");
}
