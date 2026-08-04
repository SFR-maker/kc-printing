import { SERVICES } from "../lib/service-data";
import { db } from "../lib/prisma";

/**
 * Creates the Product rows that the public service pages depend on.
 *
 * lib/service-data.ts drives every /services/* page, but /api/orders looks the product up in the
 * database by that same slug and 404s when it is missing. The seed had shipped `roll-up-banners`,
 * `vinyl-banners` and `print-design` while the site advertised `banners` and `rigid-signs`, so two
 * of the four services took a customer all the way through the order form and then failed with
 * "Product not found". Nothing on the site surfaced the mismatch.
 *
 * Additive only. Prices already in the database are left alone, because the owner edits them from
 * /admin/pricing and a sync that overwrote them would silently undo their work. Run with --dry to
 * see what would change.
 *
 *   npx tsx --env-file=.env.local scripts/sync-services.ts [--dry]
 */
async function main() {
  const dry = process.argv.includes("--dry");
  let created = 0;
  let addedTiers = 0;
  let addedAddOns = 0;

  for (const [index, service] of Object.values(SERVICES).entries()) {
    const existing = await db.product.findUnique({
      where: { slug: service.slug },
      include: { packages: true, addOns: true },
    });

    if (!existing) {
      console.log(`${dry ? "[dry] would create" : "creating"} product ${service.slug}`);
      created++;
      if (!dry) {
        await db.product.create({
          data: {
            slug: service.slug,
            name: service.name,
            description: service.tagline ?? service.name,
            category: "print",
            active: true,
            sortOrder: index,
            packages: { create: service.packages.map((p) => ({ name: p.name, price: p.price, features: p.features })) },
            addOns: { create: service.addOns.map((a) => ({ name: a.name, price: a.price, description: a.desc })) },
          },
        });
      }
      continue;
    }

    // Fill gaps without touching what is already priced.
    for (const p of service.packages) {
      if (existing.packages.some((e) => e.name === p.name)) continue;
      console.log(`${dry ? "[dry] would add" : "adding"} package ${service.slug}/${p.name} at $${p.price}`);
      addedTiers++;
      if (!dry) {
        await db.packageTier.create({
          data: { productId: existing.id, name: p.name, price: p.price, features: p.features },
        });
      }
    }

    for (const a of service.addOns) {
      if (existing.addOns.some((e) => e.name === a.name)) continue;
      console.log(`${dry ? "[dry] would add" : "adding"} add-on ${service.slug}/${a.name} at $${a.price}`);
      addedAddOns++;
      if (!dry) {
        await db.addOn.create({
          data: { productId: existing.id, name: a.name, price: a.price, description: a.desc },
        });
      }
    }
  }

  console.log(
    `\n${dry ? "[dry] " : ""}${created} product(s), ${addedTiers} package(s), ${addedAddOns} add-on(s).`
  );

  // Anything active in the database without a page is unreachable from the shop.
  const slugs = new Set(Object.values(SERVICES).map((s) => s.slug));
  const orphans = (await db.product.findMany({ where: { active: true }, select: { slug: true } }))
    .filter((p) => !slugs.has(p.slug));
  if (orphans.length) {
    console.log(`\nActive products with no public page: ${orphans.map((o) => o.slug).join(", ")}`);
    console.log("Hide them from /admin/products, or they sit in the catalogue unreachable.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
