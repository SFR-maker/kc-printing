import "server-only";

import decals from "./window-decals-scraped.json";
import clings from "./window-clings-scraped.json";
import perfs from "./window-perfs-scraped.json";

import { type WindowMaterialId, type WindowDecalSpec, windowDecalPriceKey } from "./window-decals";

/**
 * Window signage pricing, read from GotPrint on 2026-08-08 with a reseller account.
 *
 * Kept out of the client bundle deliberately, the same way rigid signs are: the three tables hold
 * 14,391 quoted prices. `server-only` makes an accidental client import a build error rather than a
 * silently oversized page.
 *
 * Every figure is an exact quote. Nothing is interpolated between quantity breaks - the
 * withhold-and-measure check run on banners showed interpolation underpricing real orders by up to
 * 12%, and with print sold at cost that is a straight loss on the job.
 *
 * The scraped minimums match GotPrint's own published "starting at" figures to the cent ($18.12
 * decals, $14.37 clings, $17.87 perfs), which is the check that the resolver was followed correctly
 * rather than a neighbouring product's table being read.
 */

interface Scraped {
  scrapedAt: string | null;
  prices: Record<string, number>;
}

const TABLES: Record<WindowMaterialId, Scraped> = {
  "window-decals": decals as unknown as Scraped,
  "window-clings": clings as unknown as Scraped,
  "window-perfs": perfs as unknown as Scraped,
};

export interface WindowDecalPrice {
  valid: boolean;
  total: number;
  error?: string;
}

/** Prices a window signage run. Exact quotes only - never an estimate. */
export function calculateWindowDecalPrice(spec: WindowDecalSpec): WindowDecalPrice {
  const table = TABLES[spec.material];
  if (!table) return { valid: false, total: 0, error: "That material isn't available." };

  const price = table.prices[windowDecalPriceKey(spec)];
  if (price === undefined) {
    return { valid: false, total: 0, error: "That combination isn't available - try a different size or quantity." };
  }
  return { valid: true, total: Math.round(price * 100) / 100 };
}

export function windowPricesScrapedAt(material: WindowMaterialId): string | null {
  return TABLES[material]?.scrapedAt ?? null;
}

/** Every material's price count, for the admin setup page's data-freshness check. */
export function windowPriceCounts(): Record<WindowMaterialId, number> {
  return Object.fromEntries(
    (Object.keys(TABLES) as WindowMaterialId[]).map((m) => [m, Object.keys(TABLES[m].prices).length]),
  ) as Record<WindowMaterialId, number>;
}
