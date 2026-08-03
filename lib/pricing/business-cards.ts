import rawData from "./business-card-data.json";
import { DEFAULT_PRICING, type PricingSettings } from "./settings";

/**
 * Real business-card print pricing, scraped from gotprint.com's order configurator
 * (https://www.gotprint.com/products/business-cards/order) via its own pricing REST API on
 * 2026-07-25. Covers every size x paper x color/sides combination gotprint actually sells (270 of
 * 360 possible combos — the other 90 are "grayscale back" paired with a premium paper, which
 * gotprint itself doesn't offer). Quantity break points and prices are gotprint's real numbers;
 * KC Printing applies its own markup on top in the calculator below rather than reselling at cost.
 */

export interface BcSize {
  id: number;
  label: string;
  width: number;
  height: number;
  orientation: number;
}

export interface BcPaper {
  id: number;
  label: string;
}

export interface BcColor {
  id: number;
  label: string;
}

interface RawData {
  sizes: BcSize[];
  papers: BcPaper[];
  colors: BcColor[];
  quantities: number[];
  matrix: Record<string, Record<string, number>>;
  rushMultiplier: Record<string, number>;
}

const data = rawData as unknown as RawData;

export const BC_SIZES: BcSize[] = data.sizes;
export const BC_PAPERS: BcPaper[] = data.papers;
export const BC_COLORS: BcColor[] = data.colors;
export const BC_ALL_QUANTITIES: number[] = data.quantities;

const ROUND_CORNERS_PRICE: Record<number, number> = {
  25: 5, 50: 5, 100: 6, 250: 8, 500: 14, 1000: 24, 2500: 58, 5000: 111, 10000: 181,
  15000: 251, 20000: 321, 25000: 391, 30000: 461, 35000: 531, 40000: 601, 45000: 671,
  50000: 741, 55000: 811, 60000: 881, 65000: 951, 70000: 1021, 75000: 1091, 80000: 1161,
  85000: 1231, 90000: 1301, 95000: 1371, 100000: 1441,
};

function matrixKey(sizeId: number, paperId: number, colorId: number): string {
  return `${sizeId}_${paperId}_${colorId}`;
}

/** Quantities gotprint actually sells for a given size/paper/color combo (some premium papers or
 * odd sizes don't offer every break point / the grayscale-back color at all). */
export function availableQuantities(sizeId: number, paperId: number, colorId: number): number[] {
  const byQty = data.matrix[matrixKey(sizeId, paperId, colorId)];
  if (!byQty) return [];
  return Object.keys(byQty).map(Number).sort((a, b) => a - b);
}

export function isComboAvailable(sizeId: number, paperId: number, colorId: number): boolean {
  return matrixKey(sizeId, paperId, colorId) in data.matrix;
}

export interface BcPriceInput {
  sizeId: number;
  paperId: number;
  colorId: number;
  quantity: number;
  rush?: boolean;
  roundCorners?: boolean;
  manualProof?: boolean;
}

export interface BcPriceBreakdown {
  valid: boolean;
  error?: string;
  basePrice: number;
  rushSurcharge: number;
  roundCornersPrice: number;
  proofPrice: number;
  total: number;
}

/** Rush turnaround is only offered up to 2,500 units (matches gotprint's own cutoff) — the
 * per-quantity multiplier is an average measured across 3 sampled size/paper combos (1.31x-1.42x),
 * since the exact rush surcharge varies slightly by combo and re-scraping all 270 combos twice
 * wasn't worth it for a feature most orders won't use. */
function rushMultiplierFor(quantity: number): number | null {
  const m = data.rushMultiplier[String(quantity)];
  return m ?? null;
}

/**
 * Prices a print run.
 *
 * `settings` carries the margin and flat fees the shop owner controls from /admin/pricing. It
 * defaults to the compiled-in values so existing call sites and tests keep their behaviour, but any
 * path that reaches a customer should pass the stored settings - otherwise the admin edits a number
 * and the quote does not move.
 */
export function calculateBusinessCardPrice(
  input: BcPriceInput,
  settings: PricingSettings = DEFAULT_PRICING
): BcPriceBreakdown {
  const { sizeId, paperId, colorId, quantity, rush = false, roundCorners = false, manualProof = false } = input;

  const byQty = data.matrix[matrixKey(sizeId, paperId, colorId)];
  if (!byQty) {
    return { valid: false, error: "This paper/color combination isn't available for the selected size.", basePrice: 0, rushSurcharge: 0, roundCornersPrice: 0, proofPrice: 0, total: 0 };
  }
  const rawBase = byQty[String(quantity)];
  if (rawBase === undefined) {
    return { valid: false, error: "This quantity isn't available for the selected options.", basePrice: 0, rushSurcharge: 0, roundCornersPrice: 0, proofPrice: 0, total: 0 };
  }

  const basePrice = round2(rawBase * settings.markupMultiplier);

  let rushSurcharge = 0;
  if (rush) {
    const mult = rushMultiplierFor(quantity);
    if (mult === null) {
      return { valid: false, error: "Rush turnaround is only available for orders of 2,500 cards or fewer.", basePrice, rushSurcharge: 0, roundCornersPrice: 0, proofPrice: 0, total: 0 };
    }
    rushSurcharge = round2(basePrice * (mult - 1));
  }

  const roundCornersPrice = roundCorners ? round2((ROUND_CORNERS_PRICE[quantity] ?? 0) * settings.roundCornersMarkup) : 0;
  const proofPrice = manualProof ? settings.manualProofPrice : 0;

  const total = round2(basePrice + rushSurcharge + roundCornersPrice + proofPrice);

  return { valid: true, basePrice, rushSurcharge, roundCornersPrice, proofPrice, total };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
