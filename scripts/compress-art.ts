import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

/**
 * Recompresses the served artwork so the deployment fits.
 *
 * public/ had grown to 301 MB across 8,209 files and Vercel stopped accepting it. The beds are a
 * build intermediate and no longer ship; these two directories genuinely do ship, but at sizes
 * chosen for generation rather than for delivery: product-art averaged 212 KB of JPEG per file for
 * images displayed a few hundred pixels wide.
 *
 * WebP at the width each is actually drawn at, rather than the width it was generated at. The
 * originals are regenerable from the beds, so nothing irreversible happens here.
 *
 *   npx tsx scripts/compress-art.ts [--dry]
 */

/** Displayed width is well under this; 1200 leaves headroom for a retina card preview. */
const MAX_W = 1200;
const QUALITY = 78;

async function main() {
  const dry = process.argv.includes("--dry");
  let before = 0, after = 0, n = 0;

  for (const dir of ["card-art", "product-art"]) {
    const root = path.join(process.cwd(), "public", "images", dir);
    if (!fs.existsSync(root)) continue;
    const files: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(jpe?g|png|webp)$/i.test(e.name)) files.push(p);
      }
    };
    walk(root);

    for (const file of files) {
      const size = fs.statSync(file).size;
      before += size;
      const meta = await sharp(file).metadata();
      const out = await sharp(file)
        .resize({ width: Math.min(meta.width ?? MAX_W, MAX_W), withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 5 })
        .toBuffer();

      // Only replace when it actually helps; a few are already smaller than a re-encode.
      if (out.length < size) {
        const target = file.replace(/\.(jpe?g|png)$/i, ".webp");
        if (!dry) {
          fs.writeFileSync(target, out);
          if (target !== file) fs.unlinkSync(file);
        }
        after += out.length;
        n++;
      } else {
        after += size;
      }
    }
  }

  const mb = (b: number) => (b / 1024 / 1024).toFixed(1) + " MB";
  console.log(`${dry ? "[dry] " : ""}recompressed ${n} files: ${mb(before)} -> ${mb(after)}`);
}

main();
