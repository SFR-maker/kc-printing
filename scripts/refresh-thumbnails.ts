/**
 * Re-render the stored template thumbnails at a higher resolution.
 *
 * The originals were 480px (business cards) / 400px (everything else) JPEGs. The "Start from a
 * design" rail on the service pages shows them at roughly 368 CSS px, which is a 1.5x upscale on a
 * retina display, so they read as blurry. They are rendered from SVG, so more pixels is genuinely
 * more detail rather than an upscale.
 *
 * Thumbnails are stored as base64 data URIs and inlined into the HTML, so the payload matters:
 * moving JPEG -> WebP roughly halves the bytes per pixel, which pays for the extra resolution.
 *
 * This touches ONLY thumbnailFront/thumbnailBack. It does not regenerate template content and does
 * not alter active/featured/sortOrder curation.
 *
 *   npx tsx scripts/refresh-thumbnails.ts          # active templates
 *   npx tsx scripts/refresh-thumbnails.ts --all    # every template
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { exportSideThumbnail, THUMBNAIL_WIDTH } from "../lib/business-card/export";
import { CardSideSchema } from "../lib/business-card/schema";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const db = new PrismaClient({ adapter });

import fsSync from "node:fs";
import nodePath from "node:path";

const THUMB_DIR = nodePath.join(process.cwd(), "public", "images", "thumbs");

/**
 * Writes the thumbnail to disk and returns the path stored on the row.
 *
 * These were base64 data URIs in Postgres. At 1,911 templates that was ~107 MB of base64 sitting in
 * rows that every query reads past. See migrate-thumbnails-to-files.ts.
 */
const toStoredPath = (buf: Buffer, slug: string, side: "front" | "back") => {
  fsSync.mkdirSync(THUMB_DIR, { recursive: true });
  const name = `${slug}${side === "back" ? "-back" : ""}.webp`;
  fsSync.writeFileSync(nodePath.join(THUMB_DIR, name), buf);
  return `/images/thumbs/${name}`;
};

async function main() {
  const all = process.argv.includes("--all");
  const rows = await db.cardTemplate.findMany({
    where: all ? {} : { active: true },
    select: { id: true, slug: true, product: true, front: true, back: true, thumbnailFront: true },
  });

  console.log(`Re-rendering thumbnails for ${rows.length} template(s)...\n`);

  let done = 0;
  let beforeBytes = 0;
  let afterBytes = 0;
  const failed: string[] = [];

  for (const row of rows) {
    try {
      const width = THUMBNAIL_WIDTH[row.product as string] ?? 640;
      const front = CardSideSchema.parse(row.front);
      const back = CardSideSchema.parse(row.back);

      const [f, b] = await Promise.all([
        exportSideThumbnail(front, width),
        exportSideThumbnail(back, width),
      ]);

      const thumbnailFront = toStoredPath(f, row.slug, "front");
      const thumbnailBack = toStoredPath(b, row.slug, "back");

      // Now measures the image bytes written, not the base64 held in the row.
      beforeBytes += row.thumbnailFront?.length ?? 0;
      afterBytes += f.byteLength + b.byteLength;

      await db.cardTemplate.update({
        where: { id: row.id },
        data: { thumbnailFront, thumbnailBack },
      });
      done += 1;
      if (done % 25 === 0) console.log(`  ${done}/${rows.length}`);
    } catch (err) {
      failed.push(`${row.slug}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\nUpdated ${done}/${rows.length}`);
  if (beforeBytes) {
    console.log(
      `Front-thumbnail payload: ${(beforeBytes / 1024 / 1024).toFixed(2)} MB -> ${(afterBytes / 1024 / 1024).toFixed(2)} MB`
    );
  }
  if (failed.length) {
    console.log(`\n${failed.length} failed:`);
    failed.forEach((f) => console.log("  " + f));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
