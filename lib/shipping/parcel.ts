import { BC_PAPERS, BC_SIZES } from "@/lib/pricing/business-cards";
import { bannerParcel } from "./banner-parcel";

/**
 * Physical weight and size of a print run, for live carrier rating.
 *
 * GotPrint publishes a caliper for every cover stock and a basis weight for none of them - their
 * paper pages state "16 pt. Premium Matte" and nothing else. So these figures are derived, not
 * quoted, and the derivation is written out here so it can be checked and corrected rather than
 * trusted blindly.
 *
 * The chain:
 *   weight = area x caliper x density
 *
 * Density comes from the one stock where GotPrint gives both numbers. Their table lists
 * "Matte Cover, 10 pt., 100 lb.", and 100 lb cover is 271 gsm by the standard basis-size
 * conversion (500 sheets of 20x26 in). That fixes coated stock at:
 *
 *   271 g/m2 / 0.010 in (0.000254 m) = 1.067 g/cm3
 *
 * Uncoated, linen and kraft stocks are bulkier for the same caliper - they have no clay coating
 * filling the fibre - so they run roughly 25% less dense. Trifecta is three plies laminated with a
 * coloured core, which sits between the two.
 *
 * CALIBRATE THESE. Put one finished box on a kitchen scale, compare against
 * `cardStackWeightOz`, and adjust the density constants until they agree. Every figure below is a
 * physics estimate, and an estimate that is 15% light means undercharged postage on every order.
 */

/** g/cm3, keyed by the finish family a stock belongs to. */
const DENSITY = {
  /** Clay-coated C2S: gloss, matte, premium matte. Anchored on GotPrint's own 10 pt / 100 lb stock. */
  coated: 1.067,
  /** Uncoated, linen and kraft. Bulkier at the same caliper. */
  uncoated: 0.8,
  /** Trifecta triple-layer with a coloured core. */
  layered: 0.95,
} as const;

type Finish = keyof typeof DENSITY;

/** Which density family each GotPrint stock belongs to, by the paper id used in the price matrix. */
const PAPER_FINISH: Record<number, Finish> = {
  7: "coated",    // 100 lb. Matte Cover
  1: "coated",    // 14 pt. Gloss
  10: "coated",   // 16 pt. Premium Matte
  75: "coated",   // 18 pt. Ultra Premium Pearl
  77: "coated",   // 18 pt. Ultra Premium Smooth White
  2: "uncoated",  // 14 pt. Uncoated
  74: "uncoated", // 13 pt. Premium Linen
  76: "uncoated", // 18 pt. Premium Kraft
  31: "layered",  // 24 pt. Trifecta Green
  32: "layered",  // 38 pt. Trifecta Black
  66: "layered",  // 38 pt. Trifecta Blue
  36: "layered",  // 38 pt. Trifecta Red
};

/**
 * Caliper in inches, parsed from the stock's own name.
 *
 * "16 pt. Premium Matte" is 0.016 in; a point is a thousandth of an inch. "100 lb. Matte Cover" is
 * named by weight rather than caliper, and GotPrint's stock table gives it as 10 pt.
 */
export function caliperIn(paperId: number): number {
  const label = BC_PAPERS.find((p) => p.id === paperId)?.label ?? "";
  const pt = label.match(/^(\d+)\s*pt/i);
  if (pt) return Number(pt[1]) / 1000;
  // The one stock named by basis weight instead; 10 pt per GotPrint's paper table.
  if (/100\s*lb/i.test(label)) return 0.010;
  // Unknown stock: 14 pt is the most common business card caliper and the safest middle guess.
  return 0.014;
}

/** Trim size in inches, parsed from the size label ("2\" x 3.5\" Horizontal ..."). */
export function trimSizeIn(sizeId: number): { widthIn: number; heightIn: number } {
  const label = BC_SIZES.find((s) => s.id === sizeId)?.label ?? "";
  const m = label.match(/([\d.]+)"?\s*x\s*([\d.]+)"/i);
  if (!m) return { widthIn: 2, heightIn: 3.5 };
  const a = Number(m[1]);
  const b = Number(m[2]);
  // Orientation does not change mass, so normalise to long edge x short edge.
  return { widthIn: Math.max(a, b), heightIn: Math.min(a, b) };
}

const GRAMS_PER_OZ = 28.3495;
const CM3_PER_IN3 = 16.3871;

/** Weight of a single card, in ounces. */
export function cardWeightOz(sizeId: number, paperId: number): number {
  const { widthIn, heightIn } = trimSizeIn(sizeId);
  const volumeIn3 = widthIn * heightIn * caliperIn(paperId);
  const grams = volumeIn3 * CM3_PER_IN3 * DENSITY[PAPER_FINISH[paperId] ?? "coated"];
  return grams / GRAMS_PER_OZ;
}

/** Weight of the cards alone for a whole run, in ounces. */
export function cardStackWeightOz(sizeId: number, paperId: number, quantity: number): number {
  return cardWeightOz(sizeId, paperId) * quantity;
}

/**
 * Packaging allowance.
 *
 * Cards ship in boxes of 100 inside a mailer or carton. The box, the shrink wrap and the void fill
 * are real weight the carrier bills for, and leaving them out is how a shop ends up eating postage.
 */
const CARDS_PER_BOX = 100;
const BOX_WEIGHT_OZ = 1.1;
const OUTER_CARTON_OZ = 3.5;
/** Every parcel needs some slack for tape, a label and packing paper. */
const PACKING_OZ = 1.5;

export interface Parcel {
  /** Inches. EasyPost's parcel object takes inches. */
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  /** Ounces. EasyPost's parcel weight is in ounces, not pounds. */
  weightOz: number;
}

/**
 * The parcel a business-card run actually ships as.
 *
 * Height comes from the physical stack: 1,000 cards at 16 pt is a 16-inch column of card, which is
 * three boxes side by side rather than one very tall one. Getting this wrong matters because
 * carriers bill dimensional weight on anything bulky.
 */
export function businessCardParcel(sizeId: number, paperId: number, quantity: number): Parcel {
  const { widthIn, heightIn } = trimSizeIn(sizeId);
  const boxes = Math.max(1, Math.ceil(quantity / CARDS_PER_BOX));
  const stackIn = quantity * caliperIn(paperId);

  const cards = cardStackWeightOz(sizeId, paperId, quantity);
  const weightOz = cards + boxes * BOX_WEIGHT_OZ + OUTER_CARTON_OZ + PACKING_OZ;

  // Boxes stack in three dimensions, not one flat layer. Laying 50 boxes out as an 8x7 array
  // produced a 29-inch carton, which is both wrong and straight into oversize surcharge territory;
  // a real shop stacks them into something close to a cube.
  const boxHeightIn = Math.min(stackIn, CARDS_PER_BOX * caliperIn(paperId)) + 0.25;
  const perSide = Math.max(1, Math.ceil(Math.cbrt(boxes)));
  const perRow = Math.min(boxes, perSide);
  const rows = Math.min(Math.ceil(boxes / perRow), perSide);
  const layers = Math.ceil(boxes / (perRow * rows));

  return {
    lengthIn: round1(widthIn * perRow + 0.75),
    widthIn: round1(heightIn * rows + 0.75),
    heightIn: round1(boxHeightIn * layers + 0.5),
    weightOz: round1(weightOz),
  };
}

/**
 * Fallback for products with no measured geometry yet.
 *
 * Postcards, banners and rigid signs have no weight model, and quoting a live rate from a guess is
 * worse than not quoting one: the customer is charged a real number derived from a made-up parcel.
 * Callers should treat a null here as "fall back to flat-rate shipping".
 */
export function parcelForProduct(
  productSlug: string,
  spec: { sizeId: number; paperId: number; quantity: number } | null,
  /** Banners are described by label rather than numeric ids, and roll rather than stack. */
  banner?: { size: string; material: string; quantity: number } | null
): Parcel | null {
  if (productSlug === "business-cards" && spec) {
    return businessCardParcel(spec.sizeId, spec.paperId, spec.quantity);
  }
  if (productSlug === "banners" && banner) {
    return bannerParcel(banner.size, banner.material, banner.quantity);
  }
  return null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export const OZ_PER_LB = 16;

/** For display: "1 lb 4.2 oz". */
export function formatWeight(oz: number): string {
  const lb = Math.floor(oz / OZ_PER_LB);
  const rem = round1(oz - lb * OZ_PER_LB);
  return lb > 0 ? `${lb} lb ${rem} oz` : `${rem} oz`;
}
