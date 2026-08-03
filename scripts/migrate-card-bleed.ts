/**
 * Re-bases stored business-card designs onto the current house bleed spec.
 *
 * Element x/y are absolute inches from the corner of the *bleed* box, so changing the bleed without
 * moving the elements would nudge every design toward the bottom-right relative to trim. This walks
 * every business-card CardTemplate and CardDesign and runs both sides through rebleedSide, which
 * keeps each element the same distance from the trim edge and re-anchors anything that bleeds off.
 *
 * Only business cards are touched. Postcards, banners and rigid signs keep their own 0.125in bleed.
 *
 * Idempotent: rebleedSide is a no-op when the side already matches the target, so re-running is safe.
 *
 *   npx tsx scripts/migrate-card-bleed.ts --dry     # report only
 *   npx tsx scripts/migrate-card-bleed.ts           # apply
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { rebleedSide } from "../lib/business-card/rebleed";
import { CardSideSchema } from "../lib/business-card/schema";
import { PRINT_SPEC } from "../lib/business-card/print-spec";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const db = new PrismaClient({ adapter });

// `--to <inches>` re-bases onto an explicit bleed instead of the house spec. Used to reverse a
// migration: rebleedSide is designed to be reversible, so running it back to the previous value
// restores the original geometry exactly.
const toArg = process.argv.indexOf("--to");
const TARGET_BLEED = toArg !== -1 ? Number(process.argv[toArg + 1]) : PRINT_SPEC.bleedIn;
const dryRun = process.argv.includes("--dry");

if (!Number.isFinite(TARGET_BLEED) || TARGET_BLEED < 0) {
  console.error(`Invalid --to value: ${process.argv[toArg + 1]}`);
  process.exit(1);
}

function convert(raw: unknown): { side: ReturnType<typeof rebleedSide>; changed: boolean } {
  const side = CardSideSchema.parse(raw);
  const next = rebleedSide(side, TARGET_BLEED);
  return { side: next, changed: next !== side };
}

async function main() {
  console.log(`Target bleed: ${TARGET_BLEED}in  (document ${PRINT_SPEC.trimWidthIn + TARGET_BLEED * 2} x ${PRINT_SPEC.trimHeightIn + TARGET_BLEED * 2}in)`);
  console.log(dryRun ? "DRY RUN - nothing will be written\n" : "Applying...\n");

  const templates = await db.cardTemplate.findMany({
    where: { product: "BUSINESS_CARD" },
    select: { id: true, slug: true, front: true, back: true },
  });

  let tChanged = 0;
  for (const t of templates) {
    try {
      const front = convert(t.front);
      const back = convert(t.back);
      if (!front.changed && !back.changed) continue;
      tChanged += 1;
      if (!dryRun) {
        await db.cardTemplate.update({
          where: { id: t.id },
          data: { front: front.side as object, back: back.side as object },
        });
      }
    } catch (err) {
      console.log(`  SKIP template ${t.slug}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log(`Templates: ${tChanged}/${templates.length} re-bled`);

  const designs = await db.cardDesign.findMany({
    where: { product: "BUSINESS_CARD" },
    select: { id: true, title: true, front: true, back: true },
  });

  let dChanged = 0;
  for (const d of designs) {
    try {
      const front = convert(d.front);
      const back = convert(d.back);
      if (!front.changed && !back.changed) continue;
      dChanged += 1;
      if (!dryRun) {
        await db.cardDesign.update({
          where: { id: d.id },
          data: { front: front.side as object, back: back.side as object },
        });
      }
    } catch (err) {
      console.log(`  SKIP design ${d.id} (${d.title}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log(`Customer designs: ${dChanged}/${designs.length} re-bled`);

  if (!dryRun && (tChanged || dChanged)) {
    console.log("\nRe-run scripts/refresh-thumbnails.ts so gallery thumbnails match the new geometry.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
