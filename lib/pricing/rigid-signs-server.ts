import "server-only";

import yardSigns from "./yard-signs-scraped.json";
import corrugated from "./corrugated-boards-scraped.json";
import pvc from "./pvc-boards-scraped.json";
import foam from "./foam-boards-scraped.json";
import aluminium from "./aluminum-boards-scraped.json";

import { type RigidMaterialId, type RigidSignSpec, rigidPriceKey } from "./rigid-signs";

/**
 * Rigid sign pricing, read from GotPrint on 2026-08-05 with a reseller account.
 *
 * Kept out of the client bundle deliberately: the five tables hold 57,293 quoted prices and come to
 * roughly two megabytes. `server-only` makes an accidental client import a build error rather than a
 * two-megabyte page.
 *
 * Every figure is an exact quote. Nothing is interpolated between quantity breaks - the same
 * withhold-and-measure check run on banners showed interpolation underpricing real orders by up to
 * 12%, and with print sold at cost that is a straight loss on the job.
 *
 * Yard signs and boards are priced by different supplier endpoints and keyed differently; the shared
 * `rigidPriceKey` builds whichever key the material needs so the two cannot drift apart.
 */

interface Scraped {
  scrapedAt: string | null;
  prices: Record<string, number>;
}

const TABLES: Record<RigidMaterialId, Scraped> = {
  "yard-signs": yardSigns as unknown as Scraped,
  "corrugated-boards": corrugated as unknown as Scraped,
  "pvc-boards": pvc as unknown as Scraped,
  "foam-boards": foam as unknown as Scraped,
  "aluminum-boards": aluminium as unknown as Scraped,
};

export interface RigidSignPrice {
  valid: boolean;
  total: number;
  error?: string;
}

/** Prices a rigid sign run. Exact quotes only - never an estimate. */
export function calculateRigidSignPrice(spec: RigidSignSpec): RigidSignPrice {
  const table = TABLES[spec.material];
  if (!table) return { valid: false, total: 0, error: "That material isn't available." };

  const price = table.prices[rigidPriceKey(spec)];
  if (price === undefined) {
    return { valid: false, total: 0, error: "That combination isn't available - try a different size or quantity." };
  }
  return { valid: true, total: Math.round(price * 100) / 100 };
}

export function rigidPricesScrapedAt(material: RigidMaterialId): string | null {
  return TABLES[material]?.scrapedAt ?? null;
}

/** Every material's price count, for the admin setup page's data-freshness check. */
export function rigidPriceCounts(): Record<RigidMaterialId, number> {
  return Object.fromEntries(
    (Object.keys(TABLES) as RigidMaterialId[]).map((m) => [m, Object.keys(TABLES[m].prices).length]),
  ) as Record<RigidMaterialId, number>;
}
