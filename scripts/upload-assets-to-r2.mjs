/**
 * Uploads the offloaded asset directories to R2.
 *
 *   node --env-file=.env.local scripts/upload-assets-to-r2.mjs            # upload what is missing
 *   node --env-file=.env.local scripts/upload-assets-to-r2.mjs --force    # re-upload everything
 *   node --env-file=.env.local scripts/upload-assets-to-r2.mjs --verify   # check only, no writes
 *
 * The object key is the path relative to public/ - `images/thumbs/foo.webp` for
 * `public/images/thumbs/foo.webp` - so lib/asset-url can build a URL by joining the CDN origin to
 * the same path the database already stores. No mapping table, nothing to keep in sync.
 *
 * Idempotent by size: an object already present with matching bytes is skipped, so an interrupted
 * run resumes rather than restarting. That matters at ~4,250 files. Use --force after recompressing
 * artwork, where the path is unchanged but the bytes are not.
 *
 * --verify is the gate before flipping NEXT_PUBLIC_ASSET_CDN_BASE: it HEADs every expected key and
 * exits non-zero if any is missing. Turning the CDN on with a partial upload would leave holes in
 * the gallery that nothing else would report.
 */
import fs from "node:fs";
import path from "node:path";
import { S3Client, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

/** Must match OFFLOADED in lib/asset-url.ts. */
const DIRS = ["images/thumbs", "images/card-art", "images/product-art", "images/templates"];

const CONTENT_TYPE = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

/**
 * A year, immutable. These filenames are content identities - a template slug or a numbered layout -
 * and recompressing artwork produces new bytes at the same path, which is what --force is for.
 * Cloudflare will serve from cache indefinitely, which is the entire point of moving them here.
 */
const CACHE_CONTROL = "public, max-age=31536000, immutable";

const CONCURRENCY = 16;
const args = new Set(process.argv.slice(2));
const FORCE = args.has("--force");
const VERIFY_ONLY = args.has("--verify");

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
for (const [k, v] of Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET })) {
  if (!v) {
    console.error(`Missing ${k} in .env.local`);
    process.exit(1);
  }
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const PUBLIC_DIR = path.join(process.cwd(), "public");

/** Every file under the offloaded directories, as {key, absolute path, size}. */
function collect() {
  const out = [];
  for (const dir of DIRS) {
    const root = path.join(PUBLIC_DIR, dir);
    if (!fs.existsSync(root)) {
      console.warn(`  (skipping ${dir} - not present)`);
      continue;
    }
    const walk = (d) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const abs = path.join(d, entry.name);
        if (entry.isDirectory()) walk(abs);
        else {
          out.push({
            // Posix separators: an object key is not a filesystem path, and Windows backslashes
            // would produce keys no URL could ever address.
            key: path.relative(PUBLIC_DIR, abs).split(path.sep).join("/"),
            abs,
            size: fs.statSync(abs).size,
          });
        }
      }
    };
    walk(root);
  }
  return out;
}

const remoteSize = async (key) => {
  try {
    return (await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }))).ContentLength;
  } catch {
    return null; // absent, or not readable - either way it needs uploading
  }
};

/** Runs `worker` over `items` with a fixed number of workers in flight. */
async function pool(items, limit, worker) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) worker(items[i++]).catch(() => {});
      // Errors are recorded by the worker itself; this only drives the queue.
    }),
  );
}

async function main() {
  const files = collect();
  const bytes = files.reduce((sum, f) => sum + f.size, 0);
  console.log(`${files.length} files, ${(bytes / 1048576).toFixed(1)} MB across ${DIRS.length} directories`);
  console.log(`bucket: ${R2_BUCKET}${VERIFY_ONLY ? "  (verify only)" : FORCE ? "  (force)" : ""}\n`);

  let uploaded = 0;
  let skipped = 0;
  let done = 0;
  const missing = [];
  const failed = [];

  const tick = () => {
    done += 1;
    if (done % 250 === 0 || done === files.length) {
      process.stdout.write(`  ${done}/${files.length}\r`);
    }
  };

  const tasks = files.map((file) => async () => {
    try {
      const remote = await remoteSize(file.key);

      if (VERIFY_ONLY) {
        if (remote === null || remote !== file.size) missing.push(file.key);
        return tick();
      }
      if (!FORCE && remote === file.size) {
        skipped += 1;
        return tick();
      }

      await s3.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: file.key,
        Body: fs.createReadStream(file.abs),
        ContentLength: file.size,
        ContentType: CONTENT_TYPE[path.extname(file.key).toLowerCase()] ?? "application/octet-stream",
        CacheControl: CACHE_CONTROL,
      }));
      uploaded += 1;
      tick();
    } catch (err) {
      failed.push(`${file.key}: ${err.name ?? "Error"} ${err.message ?? ""}`.trim());
      tick();
    }
  });

  await pool(tasks, CONCURRENCY, (t) => t());
  process.stdout.write("\n");

  if (VERIFY_ONLY) {
    if (missing.length) {
      console.log(`\n${missing.length} of ${files.length} keys missing or the wrong size:`);
      missing.slice(0, 20).forEach((k) => console.log("  " + k));
      if (missing.length > 20) console.log(`  … and ${missing.length - 20} more`);
      console.log("\nDo not set NEXT_PUBLIC_ASSET_CDN_BASE until this is clean.");
      process.exit(1);
    }
    console.log(`\nAll ${files.length} keys present with matching sizes. Safe to cut over.`);
    return;
  }

  console.log(`\nuploaded ${uploaded}, skipped ${skipped} already present`);
  if (failed.length) {
    console.log(`\n${failed.length} failed:`);
    failed.slice(0, 20).forEach((f) => console.log("  " + f));
    process.exit(1);
  }
  console.log("Now run with --verify before cutting over.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
