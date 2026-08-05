import { db } from "@/lib/prisma";

/**
 * Moves Design Studio design ids from order item config onto Order.cardDesignId.
 *
 * Before the column existed the id only rode along inside the item's `config` JSON, where nothing
 * could query it. Orders placed then are still printable - the id is there - so this lifts it onto
 * the real column rather than stranding them.
 *
 * Safe to re-run: it only fills rows where the column is null and the referenced design still
 * exists.
 *
 *   npx tsx --env-file=.env.local scripts/backfill-order-designs.ts
 */

async function main() {
  const orders = await db.order.findMany({
    where: { cardDesignId: null },
    select: { id: true, items: { select: { config: true } } },
  });

  let found = 0;
  let linked = 0;
  let missing = 0;

  for (const order of orders) {
    const id = order.items
      .map((i) => (i.config as { cardDesignId?: unknown } | null)?.cardDesignId)
      .find((v): v is string => typeof v === "string" && v.length > 0);
    if (!id) continue;
    found++;

    // The design may have been deleted since; skip rather than fail the whole run on a bad key.
    const exists = await db.cardDesign.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      console.log(`  ${order.id}: config names design ${id}, which no longer exists`);
      missing++;
      continue;
    }

    await db.order.update({ where: { id: order.id }, data: { cardDesignId: id } });
    console.log(`  ${order.id} -> ${id}`);
    linked++;
  }

  console.log(`\n${orders.length} orders without a linked design; ${found} named one in config.`);
  console.log(`linked ${linked}, skipped ${missing} whose design is gone.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
