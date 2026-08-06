import "server-only";

import raw from "./banner-finishing.json";

/**
 * What banner finishing costs.
 *
 * Kept off the client: 9,020 quoted prices across 110 sizes is 430KB, and the spec picker imports
 * the option labels, so a single module would have shipped all of it. Labels live in
 * lib/pricing/banner-finishing; the prices live here and are reached through /api/price/banners.
 *
 * What the quotes show:
 *   - Hemming on four sides is included at no charge, so it is stated rather than sold.
 *   - Four corner grommets are a flat 30c per banner at every size.
 *   - Grommets every 2ft scale with the perimeter: 90c on a 1x2ft, $7.80 on a 6x20ft.
 *
 * Prices are per banner at each quantity break, exactly as quoted. Horizontal and vertical of the
 * same size were checked and price identically, so orientation is normalised away.
 */

interface Scraped {
  scrapedAt: string | null;
  prices: Record<string, number>;
}

const data = raw as unknown as Scraped;

/**
 * What the chosen grommets add to an order.
 *
 * Returns 0 for "No Grommets" and for any combination the supplier did not quote, so a missing
 * figure can never inflate a price - and `isGrommetPriced` says which of those two it was.
 */
export function grommetPrice(size: string, grommets: string, quantity: number): number {
  return data.prices[`${size}|${grommets}|${quantity}`] ?? 0;
}

/** False when this combination carries no quote, so callers can refuse rather than guess. */
export function isGrommetPriced(size: string, grommets: string, quantity: number): boolean {
  return data.prices[`${size}|${grommets}|${quantity}`] !== undefined;
}

export const BANNER_FINISHING_PRICE_COUNT = Object.keys(data.prices).length;
