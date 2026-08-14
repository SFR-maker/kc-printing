import { db } from "../lib/prisma";

/**
 * Retires the business-card layouts that were refitted onto the other products.
 *
 * Those templates reused the business card content model - name, title, phone, email, website - on
 * banners, postcards, signs and decals. Geometrically valid and wrong as design: a banner carrying
 * a contact block at business-card scale is unreadable at banner distance, and the industry rule of
 * one inch of letter height per ten feet of viewing distance means no refit of that block can ever
 * satisfy it. They have been replaced by seed-product-templates.ts, which builds each product
 * around its own content model.
 *
 * This ran once directly against the database and was not recorded anywhere, so a fresh database
 * would have come up with 648 bad templates live. That is the whole reason this file exists: the
 * state of the catalogue should be reproducible from the repository, not from something someone
 * typed once.
 *
 * Deactivated rather than deleted. The artwork, the measured text placement and the category
 * mapping are all still useful, and `active: false` keeps them out of the galleries while leaving
 * them recoverable.
 *
 *   npx tsx --env-file=.env.local scripts/retire-refitted-templates.ts [--dry]
 */

/** Slug prefix of the refitted set. Business cards keep theirs; the other products do not. */
const REFITTED_PREFIX = "photo-";

async function main() {
  const dry = process.argv.includes("--dry");

  const where = {
    active: true,
    slug: { startsWith: REFITTED_PREFIX },
    // Business card photo templates are the originals and are correct - only the copies that were
    // refitted onto other products are retired.
    product: { not: "BUSINESS_CARD" as const },
  };

  const doomed = await db.cardTemplate.findMany({ where, select: { product: true } });
  const byProduct = doomed.reduce<Record<string, number>>((acc, t) => {
    acc[t.product] = (acc[t.product] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`${dry ? "[dry] " : ""}retiring ${doomed.length} refitted templates`);
  for (const [product, n] of Object.entries(byProduct)) console.log(`  ${product.padEnd(14)} ${n}`);

  if (!dry && doomed.length) {
    const r = await db.cardTemplate.updateMany({ where, data: { active: false } });
    console.log(`deactivated ${r.count}`);
  }

  for (const p of ["BUSINESS_CARD", "POSTCARD", "BANNER", "RIGID_SIGN", "WINDOW_DECAL"] as const) {
    const active = await db.cardTemplate.count({ where: { active: true, product: p } });
    console.log(`  ${p.padEnd(14)} ${String(active).padStart(4)} active`);
  }

  await db.$disconnect();
}

main();
