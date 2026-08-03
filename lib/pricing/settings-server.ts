import { cache } from "react";
import { db } from "@/lib/prisma";
import { DEFAULT_PRICING, PRICING_KEYS, parsePricingSettings, type PricingSettings } from "./settings";

/**
 * The pricing levers currently in force, read from SiteSetting.
 *
 * Wrapped in React's `cache` so a page that quotes a price, renders a shipping table and builds a
 * Stripe session all read one consistent snapshot from a single query, rather than racing an edit
 * made halfway through the request.
 *
 * A database failure returns the compiled-in defaults instead of throwing: a settings table that is
 * briefly unreachable should not take the shop's checkout offline.
 */
export const getPricingSettings = cache(async (): Promise<PricingSettings> => {
  try {
    const rows = await db.siteSetting.findMany({
      where: { key: { in: Object.values(PRICING_KEYS) } },
      select: { key: true, value: true },
    });
    return parsePricingSettings(rows);
  } catch (err) {
    console.error("Falling back to default pricing - could not read settings:", err);
    return DEFAULT_PRICING;
  }
});
