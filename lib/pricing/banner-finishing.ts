import catalogue from "./banner-finishing-catalogue.json";

/**
 * Banner finishing options: grommets, and the hemming that comes included.
 *
 * These are priced by the supplier as separate options on top of the size/material/quantity curve,
 * and the original banner scrape never captured them. The builder asserted "hemmed with grommets"
 * and charged for neither, so every banner sold with grommets lost the grommet cost outright - print
 * is sold at cost, so it came straight off the job.
 *
 * Only the labels are here. The 9,020 quoted prices are 430KB and this module is imported by the
 * spec picker, so they live in lib/pricing/banner-finishing-server and are reached through
 * /api/price/banners.
 */

interface Catalogue {
  scrapedAt: string | null;
  groups: Record<string, string[]>;
  quantities: number[];
}

const data = catalogue as Catalogue;

export const GROMMET_OPTIONS: string[] = data.groups.Grommets ?? [];
export const DEFAULT_GROMMETS = "Grommets - Every 2ft";

/** Hemming is included on all four sides at no charge; there is nothing to choose. */
export const HEMMING_INCLUDED = data.groups.Hemming?.[0] ?? "Hemming - 4 Sides";

/** Short description for the spec panel, so the customer knows what the charge is for. */
export function grommetNote(grommets: string): string {
  if (/4 Corners/i.test(grommets)) return "One in each corner — enough for a flat wall mount.";
  if (/Every 2ft/i.test(grommets)) return "Every two feet around the edge — what you want for rope, zip ties or wind.";
  return "No holes punched. Choose this if you are framing it or hanging it another way.";
}

export const BANNER_FINISHING_SCRAPED_AT = data.scrapedAt;
