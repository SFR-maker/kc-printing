import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/prisma";
import { PRICING_TAG } from "@/lib/cache-tags";
import { DEFAULT_PRICING, PRICING_KEYS, parsePricingSettings, type PricingSettings } from "./settings";

/**
 * The query alone, cached across requests.
 *
 * Deliberately allowed to throw rather than catching here. The fallback to DEFAULT_PRICING must
 * live *outside* the cache: caching it would mean one transient Railway blip pins the entire shop
 * to compiled-in default pricing for the whole TTL, on every request, long after the database came
 * back - turning a momentary glitch into a sustained mispricing. A throw inside `unstable_cache`
 * simply is not cached, so the next request retries the database.
 */
const readPricingSettings = unstable_cache(
  async (): Promise<PricingSettings> => {
    const rows = await db.siteSetting.findMany({
      where: { key: { in: Object.values(PRICING_KEYS) } },
      select: { key: true, value: true },
    });
    return parsePricingSettings(rows);
  },
  ["pricing-settings"],
  { revalidate: 300, tags: [PRICING_TAG] },
);

/**
 * The pricing levers currently in force, read from SiteSetting.
 *
 * Two layers, doing two different jobs. React's `cache` dedupes within a single render, so a page
 * that quotes a price, renders a shipping table and builds a Stripe session reads one consistent
 * snapshot rather than racing an edit made halfway through the request. `unstable_cache` above
 * persists that snapshot across requests, so the query is not repeated per visitor; /admin/pricing
 * calls `revalidateTag(PRICING_TAG)` so an owner's edit still appears at once.
 *
 * A database failure returns the compiled-in defaults instead of throwing: a settings table that is
 * briefly unreachable should not take the shop's checkout offline.
 */
export const getPricingSettings = cache(async (): Promise<PricingSettings> => {
  try {
    return await readPricingSettings();
  } catch (err) {
    console.error("Falling back to default pricing - could not read settings:", err);
    return DEFAULT_PRICING;
  }
});
