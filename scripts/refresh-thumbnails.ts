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

/**
 * Photo templates get a smaller thumbnail than vector ones, and it is not a quality compromise.
 *
 * A flat vector card compresses to a few KB at any size, so there is no reason to shrink it. A
 * full-bleed photograph does not: at the 960px business-card width these came to ~56KB each, and
 * 1,818 of them is ~100MB added to a deployment that has already been rejected once for size.
 *
 * The gallery grid renders a tile at roughly 250 CSS px, so 512 is exactly the 2x a retina screen
 * asks for and anything beyond it is bytes nobody can see. The exception is the templates marked
 * `featured`: those are the three-up rail on the service pages at ~368 CSS px, where 2x is ~736 -
 * so they keep the full width. There are 18 of them, which costs about 1MB.
 */
const GALLERY_PHOTO_WIDTH = 512;
const GALLERY_PHOTO_QUALITY = 65;

/** Extensions the SVG rasterizer can decode directly; anything else is a transcoded photo. */
const RASTERIZER_SAFE_EXT = /\.(png|jpe?g|svg)$/i;

/** True when a side's artwork is a photograph rather than vector shapes and type. */
function isPhotoSide(side: unknown): boolean {
  const elements = (side as { elements?: { type?: string; src?: string }[] })?.elements ?? [];
  return elements.some(
    (el) =>
      el.type === "image" &&
      typeof el.src === "string" &&
      !el.src.startsWith("data:") &&
      !RASTERIZER_SAFE_EXT.test(el.src.split("?")[0])
  );
}

async function main() {
  const all = process.argv.includes("--all");
  /*
   * Re-renders only the templates whose artwork the rasterizer could not previously read.
   *
   * librsvg silently rendered a blank where every WebP photograph should have been, so these 1,818
   * rows carry a thumbnail of an empty card. The other 1,249 are correct and rewriting them would
   * churn 1,249 files in the repository for no change.
   */
  const photoOnly = process.argv.includes("--photo-only");

  const found = await db.cardTemplate.findMany({
    where: all ? {} : { active: true },
    select: { id: true, slug: true, product: true, featured: true, front: true, back: true, thumbnailFront: true },
  });
  const rows = photoOnly ? found.filter((r) => isPhotoSide(r.front)) : found;

  console.log(`Re-rendering thumbnails for ${rows.length} template(s)...\n`);

  let done = 0;
  let beforeBytes = 0;
  let afterBytes = 0;
  const failed: string[] = [];

  for (const row of rows) {
    try {
      const fullWidth = THUMBNAIL_WIDTH[row.product as string] ?? 640;
      const front = CardSideSchema.parse(row.front);
      const back = CardSideSchema.parse(row.back);

      // Only a non-featured photograph is shrunk; see GALLERY_PHOTO_WIDTH.
      const shrink = isPhotoSide(row.front) && !row.featured;
      const width = shrink ? GALLERY_PHOTO_WIDTH : fullWidth;
      const opts = shrink ? { quality: GALLERY_PHOTO_QUALITY } : undefined;

      const [f, b] = await Promise.all([
        exportSideThumbnail(front, width, width, opts),
        exportSideThumbnail(back, width, width, opts),
      ]);

      const thumbnailFront = toStoredPath(f, row.slug, "front");
      /*
       * No back thumbnail file.
       *
       * Nothing renders it: the gallery selects `thumbnailBack: false`, and the thumbnail route
       * only reaches for it if the front is missing, which is never. It was 3,067 files and about
       * 45MB of a deployment that had grown past what Vercel would accept.
       */
      const thumbnailBack = null;

      // Now measures the image bytes written, not the base64 held in the row.
      beforeBytes += row.thumbnailFront?.length ?? 0;
      afterBytes += f.byteLength;

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
