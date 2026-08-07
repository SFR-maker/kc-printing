import "server-only";

import bannersRaw from "./banners-scraped.json";
import postcardsRaw from "./postcards-scraped.json";
import yardSigns from "./yard-signs-scraped.json";
import corrugated from "./corrugated-boards-scraped.json";
import pvc from "./pvc-boards-scraped.json";
import foam from "./foam-boards-scraped.json";
import aluminium from "./aluminum-boards-scraped.json";
import bcData from "./business-card-data.json";

/**
 * The cheapest a customer can actually buy each product for.
 *
 * The marketing pages carried "from $39", "$49", "$79" and "$59" - the Silver, Gold and Platinum
 * *design package* fees, not the price of printing anything. A customer reading "banners from $79"
 * and finding a banner at $7.71 has been told the wrong thing about the product in the most
 * consequential place on the page.
 *
 * Derived from the price tables rather than typed, so they cannot drift when the catalogue changes -
 * which it does, and did: banners went from twelve sizes to a hundred and ten this week.
 *
 * Server-only, because the tables it reads run to megabytes. The pages using it are server
 * components, so the figures are baked into the HTML.
 */

const table = (raw: unknown) => (raw as { prices: Record<string, number> }).prices;

function cheapest(prices: Record<string, number>): number {
  let min = Infinity;
  for (const v of Object.values(prices)) if (v > 0 && v < min) min = v;
  return min;
}

/** Business cards store a size/paper/colour matrix rather than a flat map. */
function cheapestBusinessCard(): number {
  const matrix = (bcData as unknown as { matrix: Record<string, Record<string, number>> }).matrix;
  let min = Infinity;
  for (const row of Object.values(matrix)) {
    for (const v of Object.values(row)) if (typeof v === "number" && v > 0 && v < min) min = v;
  }
  return min;
}

export const STARTING_PRICES: Record<string, number> = {
  "business-cards": cheapestBusinessCard(),
  postcards: cheapest(table(postcardsRaw)),
  banners: cheapest(table(bannersRaw)),
  "rigid-signs": Math.min(
    ...[yardSigns, corrugated, pvc, foam, aluminium].map((d) => cheapest(table(d))),
  ),
};

/**
 * "from $9" - rounded up to the whole dollar.
 *
 * Up rather than down, always: the real floor for business cards is $8.39, so "from $9" is a price
 * the customer can actually be charged and beaten, while "from $8" would advertise a figure nothing
 * is sold at. Ceiling keeps the claim conservative in the customer's favour.
 */
export function startingPriceLabel(slug: string): string {
  const price = STARTING_PRICES[slug];
  if (!price || !Number.isFinite(price)) return "";
  return `from $${Math.ceil(price)}`;
}
