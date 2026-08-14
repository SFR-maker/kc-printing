import { db } from "../lib/prisma";
import { SERVICES } from "../lib/service-data";

/**
 * Guarantees a Product row exists for every product the shop actually sells.
 *
 * window-decals shipped with a configurator, a template gallery, artwork inspection and a working
 * price endpoint, but no row in the Product table. POST /api/orders looks the service up by slug
 * before it prices anything, so every window decal order returned 404 "Product not found" - the
 * customer configured a real decal, saw a real quote, pressed the button and got a generic
 * "something went wrong". A complete, silent, 100% loss of that product's orders.
 *
 * Derived from SERVICES rather than a hand-kept list, so adding a product to the site cannot leave
 * its orders un-creatable again.
 *
 *   npx tsx --env-file=.env.local scripts/ensure-products.ts [--dry]
 */

async function main() {
  const dry = process.argv.includes("--dry");
  const slugs = Object.keys(SERVICES);
  let created = 0, ok = 0;

  for (const [i, slug] of slugs.entries()) {
    const service = SERVICES[slug];
    const existing = await db.product.findUnique({ where: { slug } });
    if (existing) {
      ok++;
      if (!existing.active && !dry) {
        await db.product.update({ where: { slug }, data: { active: true } });
        console.log(`  reactivated ${slug}`);
      }
      continue;
    }
    console.log(`  MISSING -> ${slug}`);
    if (!dry) {
      await db.product.create({
        data: {
          slug,
          name: service.name,
          description: service.description,
          category: "print",
          active: true,
          sortOrder: i,
        },
      });
    }
    created++;
  }

  console.log(`${dry ? "[dry] " : ""}${ok} present, ${created} created`);
  await db.$disconnect();
}

main();
