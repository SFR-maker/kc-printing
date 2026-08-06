import "server-only";

import raw from "./banners-scraped.json";

/**
 * Banner pricing, read from GotPrint's price API with a reseller account.
 *
 * Kept off the client deliberately. The table holds 13,530 quoted prices across 110 sizes and comes
 * to 1.1MB; lib/pricing/banners is imported by the spec picker, so shipping it produced three 1.1MB
 * browser chunks. `server-only` turns an accidental client import into a build error rather than a
 * megabyte on every page load. The options a customer picks between live in lib/pricing/banners.
 *
 * Every figure is an exact quote. Nothing is interpolated: the same withhold-and-measure check that
 * was run when this table held twelve sizes showed interpolation between quantity breaks underpricing
 * real orders by up to 12%, and print sells at cost. All 41 breaks are now quoted for all 330
 * size/material/colour combinations, so there is nothing left to interpolate between.
 */

interface Scraped {
  scrapedAt: string | null;
  prices: Record<string, number>;
}

const data = raw as unknown as Scraped;

export interface BannerPriceInput {
  size: string;
  material: string;
  quantity: number;
}

export interface BannerPrice {
  valid: boolean;
  error?: string;
  total: number;
}

const COLOR = "Full Color Front, No Back";

/** Prices a banner run from quoted figures only. */
export function calculateBannerPrice(input: BannerPriceInput): BannerPrice {
  const { size, material, quantity } = input;

  if (!Number.isFinite(quantity) || quantity < 1) {
    return { valid: false, error: "Choose how many banners you need.", total: 0 };
  }

  const price = data.prices[`${size}|${material}|${COLOR}|${quantity}`];
  if (price !== undefined) return { valid: true, total: Math.round(price * 100) / 100 };

  const anyForCombo = Object.keys(data.prices).some((k) => k.startsWith(`${size}|${material}|`));
  return anyForCombo
    ? { valid: false, error: "That quantity isn't available for the selected size and material.", total: 0 }
    : { valid: false, error: "That size and material combination isn't available.", total: 0 };
}

/** False when the combination carries no quote, so callers can refuse rather than guess. */
export function isBannerPriced(size: string, material: string, quantity: number): boolean {
  return data.prices[`${size}|${material}|${COLOR}|${quantity}`] !== undefined;
}

export const BANNER_PRICES_SCRAPED_AT = data.scrapedAt;
export const BANNER_PRICE_COUNT = Object.keys(data.prices).length;
