import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Picks the window-decal templates the service page and gallery lead with.
 *
 * The set is procedurally generated - four formats stamped across eight industries and three
 * archetypes - so most of the 96 are visual siblings. Without a curated `featured` subset the
 * service page's hero rail queries `featured: true` and gets nothing back, and the gallery opens on
 * whatever insertion order produced, which cycles industry-by-industry through strong and weak
 * layouts in lockstep.
 *
 * The chosen twelve span all three archetypes and all four formats across varied industries, so the
 * rail reads as a range of window graphics rather than four versions of the same one.
 *
 *   npx tsx scripts/curate-window-decals.ts
 */

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

/**
 * Ordered: the first three are what the service page's hero rail shows.
 *
 * Drawn only from the eight industries the generator seeds (CATEGORIES.slice(0, 8) in
 * generate-window-decal) - naming a restaurant or salon slug here silently featured nothing,
 * because those categories produce no window templates.
 */
const FEATURED = [
  "automotive-window-landscape-open-for-business",
  "cleaning-window-circle-open-for-business",
  "real-estate-window-landscape-store-hours",
  "construction-window-banner-open-for-business",
  "plumbing-window-portrait-offer-panel",
  "landscaping-window-circle-store-hours",
  "electrical-window-banner-store-hours",
  "roofing-window-landscape-offer-panel",
  "real-estate-window-portrait-open-for-business",
  "cleaning-window-banner-offer-panel",
  "landscaping-window-landscape-open-for-business",
  "automotive-window-circle-offer-panel",
];

async function main() {
  // Cleared first so re-running after changing the list does not leave the old picks featured.
  await db.cardTemplate.updateMany({
    where: { product: "WINDOW_DECAL" },
    data: { featured: false, sortOrder: 0 },
  });

  const missing: string[] = [];
  for (const [i, slug] of FEATURED.entries()) {
    const found = await db.cardTemplate.updateMany({
      where: { slug, product: "WINDOW_DECAL" },
      data: { featured: true, sortOrder: i + 1 },
    });
    if (found.count === 0) missing.push(slug);
  }

  const featured = await db.cardTemplate.count({ where: { product: "WINDOW_DECAL", featured: true, active: true } });
  console.log(`featured ${featured} of ${FEATURED.length} window-decal templates`);
  if (missing.length) {
    console.log("missing slugs (generator and this list have drifted):");
    for (const s of missing) console.log(`  - ${s}`);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
