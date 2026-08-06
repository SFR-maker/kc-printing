import raw from "./banner-finishing.json";

/**
 * Banner finishing: grommets and hemming.
 *
 * These are priced by the supplier as separate options on top of the size/material/quantity curve,
 * and the original banner scrape never captured them. The builder asserted "hemmed with grommets"
 * and charged for neither, so every banner sold with grommets lost the grommet cost outright - print
 * is sold at cost, so it came straight off the job.
 *
 * What the quotes show:
 *   - Hemming on four sides is included at no charge, so it is stated rather than sold.
 *   - Four corner grommets are a flat 30c per banner at every size.
 *   - Grommets every 2ft scale with the perimeter: 90c on a 1x2ft, $7.80 on a 6x20ft.
 *
 * Prices are per banner at each quantity break, exactly as quoted - not a unit price multiplied out.
 * Horizontal and vertical of the same size were checked and price identically, so orientation is
 * normalised away.
 */

interface Scraped {
  scrapedAt: string | null;
  groups: Record<string, string[]>;
  quantities: number[];
  prices: Record<string, number>;
}

const data = raw as Scraped;

export const GROMMET_OPTIONS: string[] = data.groups.Grommets ?? [];
export const DEFAULT_GROMMETS = "Grommets - Every 2ft";

/** Hemming is included on all four sides at no charge; there is nothing to choose. */
export const HEMMING_INCLUDED = data.groups.Hemming?.[0] ?? "Hemming - 4 Sides";

/**
 * What the chosen grommets add to a banner order.
 *
 * Returns 0 for "No Grommets" and for any combination the supplier did not quote, so a missing
 * figure can never inflate a price - and `isPriced` says which of those two it was.
 */
export function grommetPrice(size: string, grommets: string, quantity: number): number {
  return data.prices[`${size}|${grommets}|${quantity}`] ?? 0;
}

/** False when this combination carries no quote, so callers can refuse rather than guess. */
export function isGrommetPriced(size: string, grommets: string, quantity: number): boolean {
  return data.prices[`${size}|${grommets}|${quantity}`] !== undefined;
}

/** Short description for the spec panel, so the customer knows what the charge is for. */
export function grommetNote(grommets: string): string {
  if (/4 Corners/i.test(grommets)) return "One in each corner — enough for a flat wall mount.";
  if (/Every 2ft/i.test(grommets)) return "Every two feet around the edge — what you want for rope, zip ties or wind.";
  return "No holes punched. Choose this if you are framing it or hanging it another way.";
}

export const BANNER_FINISHING_SCRAPED_AT = data.scrapedAt;
