import catalogue from "./banners-catalogue.json";

/**
 * The options a customer chooses between when ordering a banner.
 *
 * Prices are deliberately absent. The table holds 13,530 quoted prices across 110 sizes and comes to
 * 1.1MB, and this module is imported by the spec picker - so shipping prices from here put three
 * 1.1MB chunks in the browser bundle. Quoting happens server-side through /api/price/banners, the
 * same arrangement rigid signs already use, and this file carries the 2KB of labels the form needs.
 *
 * The size list is now the supplier's whole catalogue - 110 sizes, 1 x 2 ft up to 6 x 20 ft - rather
 * than twelve hand-picked ones. Interpolation is gone with it: all 41 quantity breaks are quoted for
 * all 330 size/material combinations, so there is nothing left to interpolate between, and the
 * interpolation that used to fill the gaps was measured underpricing real orders by up to 12%.
 */

interface Catalogue {
  scrapedAt: string | null;
  sizes: string[];
  materials: string[];
  colors: string[];
  quantities: number[];
  /** Combinations offering fewer than the full quantity list, by `size|material|colour`. */
  qtyCounts: Record<string, number>;
}

const data = catalogue as Catalogue;

export interface BannerOption {
  id: string;
  label: string;
}

/** Ordered smallest to largest, which is how the picker groups them. */
export const BANNER_SIZES: BannerOption[] = data.sizes.map((label) => ({ id: label, label }));

export const BANNER_MATERIALS: BannerOption[] = [...data.materials]
  .sort((a, b) => a.localeCompare(b))
  .map((label) => ({ id: label, label }));

/** Banners print one side only; the supplier offers no reverse. */
export const BANNER_COLOR = data.colors[0] ?? "Full Color Front, No Back";

/**
 * Every quantity break the supplier quotes.
 *
 * This was a hand-written list of eight while the supplier quotes 41, so most of the price curve was
 * unreachable - somebody wanting 60 banners had no way to ask for them.
 */
export const BANNER_QUANTITIES: number[] = data.quantities;

/**
 * Quantity breaks available for a given size and material.
 *
 * Availability is per combination and each supports a prefix of the list, so a stored count says
 * where it stops. Every combination currently reaches all 41; the check stays because the catalogue
 * is the supplier's rather than ours.
 */
export function bannerQuantitiesFor(size: string, material: string): number[] {
  const n = data.qtyCounts[`${size}|${material}|${BANNER_COLOR}`];
  return n === undefined ? data.quantities : data.quantities.slice(0, n);
}

/** Whether the supplier prints this size on this material at all. */
export function isBannerComboAvailable(size: string, material: string): boolean {
  return bannerQuantitiesFor(size, material).length > 0;
}

/** Square footage, used for ordering sizes and for the parcel model. */
export function areaSqFt(sizeLabel: string): number {
  const m = sizeLabel.match(/([\d.]+)\s*ft\s*x\s*([\d.]+)\s*ft/i);
  return m ? Number(m[1]) * Number(m[2]) : 0;
}

export const BANNER_PRICES_SCRAPED_AT = data.scrapedAt;
