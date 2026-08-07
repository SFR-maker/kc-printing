import raw from "./postcards-scraped.json";

/**
 * Postcard pricing, read off GotPrint's own configurator on 2026-08-05.
 *
 * Every figure is an exact quoted price. Nothing is interpolated: the same withhold-and-measure
 * check that was run on banners showed interpolation between quantity breaks underpricing real
 * orders by up to 12%, and with print sold at cost that is a straight loss. The builder therefore
 * offers only combinations that were actually priced - which is also how business cards already
 * behave.
 *
 * The catalogue is genuinely ragged, and that raggedness is the supplier's rather than a gap in the
 * data:
 *
 *   - a grayscale back exists on only three of the twelve stocks
 *   - heavier stocks start at higher quantities; Trifecta offers five breaks where gloss offers seven
 *
 * Offering a combination the supplier will not print is worse than offering fewer, so availability
 * is derived from the price table rather than declared separately and allowed to drift from it.
 */

interface Scraped {
  scrapedAt: string | null;
  prices: Record<string, number>;
}

const data = raw as Scraped;

export interface PostcardOption {
  id: string;
  label: string;
}

const points = Object.entries(data.prices).map(([key, price]) => {
  const [size, paper, color, qty] = key.split("|");
  return { size, paper, color, quantity: Number(qty), price };
});

export const POSTCARD_SIZES: PostcardOption[] = [...new Set(points.map((p) => p.size))]
  .map((label) => ({ id: label, label }))
  .sort((a, b) => areaSqIn(a.label) - areaSqIn(b.label));

export const POSTCARD_PAPERS: PostcardOption[] = [...new Set(points.map((p) => p.paper))]
  .map((label) => ({ id: label, label }));

export const POSTCARD_COLORS: PostcardOption[] = [...new Set(points.map((p) => p.color))]
  .map((label) => ({ id: label, label }));

/** Finished area, used to order the size list and to derive parcel weight. */
export function areaSqIn(sizeLabel: string): number {
  const m = sizeLabel.match(/([\d.]+)"?\s*x\s*([\d.]+)"/);
  return m ? Number(m[1]) * Number(m[2]) : 0;
}

/**
 * Colours actually printable on a given size and stock.
 *
 * A grayscale back is only offered on a handful of stocks. Listing it everywhere would let a
 * customer configure an order the supplier cannot produce, which surfaces as a failure after
 * payment rather than as a disabled option before it.
 */
export function availableColors(size: string, paper: string): string[] {
  return [...new Set(points.filter((p) => p.size === size && p.paper === paper).map((p) => p.color))];
}

/** Quantities offered for a size, stock and colour, ascending. */
export function availableQuantities(size: string, paper: string, color: string): number[] {
  return points
    .filter((p) => p.size === size && p.paper === paper && p.color === color)
    .map((p) => p.quantity)
    .sort((a, b) => a - b);
}

/** Whether the supplier prints this combination at all. */
export function isComboAvailable(size: string, paper: string, color: string): boolean {
  return availableQuantities(size, paper, color).length > 0;
}

export interface PostcardPriceInput {
  size: string;
  paper: string;
  color: string;
  quantity: number;
}

export interface PostcardPrice {
  valid: boolean;
  error?: string;
  total: number;
}

/** Prices a postcard run. Only exact, quoted figures - never an estimate. */
export function calculatePostcardPrice(input: PostcardPriceInput): PostcardPrice {
  const { size, paper, color, quantity } = input;

  // Nothing chosen yet is not the same as a choice that cannot be filled: "that quantity isn't
  // available" reads as a rejection of something the customer picked, when they have not picked.
  if (!quantity) {
    return { valid: false, error: "Choose a quantity to see your price.", total: 0 };
  }

  const price = data.prices[`${size}|${paper}|${color}|${quantity}`];

  if (price !== undefined) return { valid: true, total: round2(price) };

  if (!isComboAvailable(size, paper, color)) {
    return { valid: false, error: "That paper and print option combination isn't available in this size.", total: 0 };
  }
  return { valid: false, error: "That quantity isn't available for the selected options.", total: 0 };
}

export const POSTCARD_PRICES_SCRAPED_AT = data.scrapedAt;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
