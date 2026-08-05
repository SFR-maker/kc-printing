import raw from "./banners-scraped.json";

/**
 * Banner pricing, from prices read off GotPrint's own configurator on 2026-08-04.
 *
 * Twelve sizes across three materials. Most carry eight quantity breaks; 2 ft x 4 ft carries all
 * forty-one, because it was captured before the run was scoped down. That full curve is not
 * redundant - it is the control used to measure how far interpolation drifts between breaks, which
 * is the only honest way to quote a quantity nobody scraped.
 */

interface Scraped {
  scrapedAt: string | null;
  prices: Record<string, number>;
}

const data = raw as Scraped;

export interface BannerOption {
  id: string;
  label: string;
}

const parsed = Object.entries(data.prices).map(([key, price]) => {
  const [size, material, color, qty] = key.split("|");
  return { size, material, color, quantity: Number(qty), price };
});

export const BANNER_SIZES: BannerOption[] = [...new Set(parsed.map((p) => p.size))]
  .map((label) => ({ id: label, label }))
  .sort((a, b) => areaSqFt(a.label) - areaSqFt(b.label));

export const BANNER_MATERIALS: BannerOption[] = [...new Set(parsed.map((p) => p.material))]
  .map((label) => ({ id: label, label }))
  .sort((a, b) => a.label.localeCompare(b.label));

/** Quantity breaks offered in the builder. Anything between them is interpolated. */
export const BANNER_QUANTITIES = [1, 2, 3, 5, 10, 25, 50, 100];

/** Square footage, used for ordering sizes and for the parcel model. */
export function areaSqFt(sizeLabel: string): number {
  const m = sizeLabel.match(/([\d.]+)\s*ft\s*x\s*([\d.]+)\s*ft/i);
  return m ? Number(m[1]) * Number(m[2]) : 0;
}

export interface BannerPriceInput {
  size: string;
  material: string;
  quantity: number;
}

export interface BannerPrice {
  valid: boolean;
  error?: string;
  total: number;
  /** True when the figure came straight from the supplier rather than being interpolated. */
  exact: boolean;
}

const COLOR = "Full Color Front, No Back";

/** One scraped point. Exposed so interpolation can be measured against a withheld subset. */
export interface PricePoint {
  size: string;
  material: string;
  quantity: number;
  price: number;
}

export const BANNER_POINTS: PricePoint[] = parsed.map(({ size, material, quantity, price }) => ({
  size, material, quantity, price,
}));

/**
 * Prices a banner run.
 *
 * An exact scraped figure is used whenever one exists. Otherwise the price is interpolated between
 * the nearest captured breaks on a per-unit basis rather than on the total, because banner pricing
 * is close to linear per unit within a break but the total is not - interpolating totals overprices
 * the middle of every range.
 */
export function calculateBannerPrice(
  input: BannerPriceInput,
  /** Defaults to every scraped point. Narrowed in tests to measure interpolation honestly. */
  points: PricePoint[] = BANNER_POINTS
): BannerPrice {
  const { size, material, quantity } = input;

  if (!Number.isFinite(quantity) || quantity < 1) {
    return { valid: false, error: "Choose how many banners you need.", total: 0, exact: false };
  }

  const curve = points
    .filter((p) => p.size === size && p.material === material)
    .sort((a, b) => a.quantity - b.quantity);

  const exact = curve.find((p) => p.quantity === quantity);
  if (exact) return { valid: true, total: round2(exact.price), exact: true };

  if (!curve.length) {
    return { valid: false, error: "That size and material combination isn't available.", total: 0, exact: false };
  }

  const below = [...curve].reverse().find((p) => p.quantity < quantity);
  const above = curve.find((p) => p.quantity > quantity);

  // Beyond the top break, hold the cheapest per-unit rate rather than extrapolating a curve that
  // was never measured out there.
  if (!above) {
    const last = curve[curve.length - 1];
    return { valid: true, total: round2((last.price / last.quantity) * quantity), exact: false };
  }
  if (!below) {
    return { valid: true, total: round2((above.price / above.quantity) * quantity), exact: false };
  }

  const perUnitBelow = below.price / below.quantity;
  const perUnitAbove = above.price / above.quantity;
  const t = (quantity - below.quantity) / (above.quantity - below.quantity);
  const perUnit = perUnitBelow + (perUnitAbove - perUnitBelow) * t;

  return { valid: true, total: round2(perUnit * quantity), exact: false };
}

/** When the underlying prices were captured, for the admin pricing screen. */
export const BANNER_PRICES_SCRAPED_AT = data.scrapedAt;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
