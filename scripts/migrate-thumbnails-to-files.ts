import fs from "node:fs";
import path from "node:path";
import { db } from "../lib/prisma";

/**
 * Moves template thumbnails out of Postgres and onto disk.
 *
 * They were stored as base64 data URIs in the templates table. That was fine at a few hundred
 * templates and stopped being fine at 1,911: roughly 63 MB of base64 living in rows that every
 * `findMany` has to skip past, in a column that cannot be cached, ranged, or served by anything but
 * the application. Base64 also costs about a third more bytes than the image it encodes.
 *
 * The column now holds a path. The thumbnail route already treated a non-data-URI value as
 * something other than inline bytes, so this is the migration it was left open for.
 *
 *   npx tsx --env-file=.env.local scripts/migrate-thumbnails-to-files.ts [--dry]
 */

const OUT = path.join(process.cwd(), "public", "images", "thumbs");

async function main() {
  const dry = process.argv.includes("--dry");
  const rows = await db.cardTemplate.findMany({
    select: { id: true, slug: true, thumbnailFront: true, thumbnailBack: true },
  });

  let moved = 0, already = 0, empty = 0, bytesBefore = 0, bytesAfter = 0;
  if (!dry) fs.mkdirSync(OUT, { recursive: true });

  for (const t of rows) {
    const update: { thumbnailFront?: string | null; thumbnailBack?: string | null } = {};

    for (const side of ["thumbnailFront", "thumbnailBack"] as const) {
      const stored = t[side];
      if (!stored) { if (side === "thumbnailFront") empty++; continue; }
      if (!stored.startsWith("data:")) { if (side === "thumbnailFront") already++; continue; }

      const m = stored.match(/^data:image\/([a-z]+);base64,([\s\S]*)$/);
      if (!m) continue;
      const [, ext, b64] = m;
      const buf = Buffer.from(b64, "base64");
      bytesBefore += stored.length;
      bytesAfter += buf.byteLength;

      const name = `${t.slug}${side === "thumbnailBack" ? "-back" : ""}.${ext}`;
      if (!dry) fs.writeFileSync(path.join(OUT, name), buf);
      update[side] = `/images/thumbs/${name}`;
      if (side === "thumbnailFront") moved++;
    }

    if (!dry && Object.keys(update).length) {
      await db.cardTemplate.update({ where: { id: t.id }, data: update });
    }
  }

  const mb = (n: number) => (n / 1024 / 1024).toFixed(2) + " MB";
  console.log(`${dry ? "[dry] " : ""}templates ${rows.length}: moved ${moved}, already on disk ${already}, no thumbnail ${empty}`);
  console.log(`  base64 in Postgres : ${mb(bytesBefore)}`);
  console.log(`  files on disk      : ${mb(bytesAfter)}  (base64 overhead removed)`);
  await db.$disconnect();
}

main();
