/**
 * Where the bulk template artwork is served from.
 *
 * Thumbnails, card art, product art and the archetype textures are ~92 MB across ~4,250 files, and
 * they grow with the catalogue rather than with the code. Shipping them inside the deployment was
 * costing far more than bandwidth: Next's file tracer cannot statically resolve the computed path
 * that resolve-images-server reads artwork through, so it pulls all of public/ into every function
 * that can reach one - putting two Lambdas at half of Vercel's 250 MB limit with the catalogue
 * still growing. Moving these four directories to object storage is what takes that ceiling away.
 *
 * The DB is deliberately not involved. CardTemplate.thumbnailFront still stores `/images/thumbs/
 * <slug>.webp`, and front/back JSON still hold `/images/card-art/...` - a relative path, exactly as
 * before. Rewriting ~950 rows of JSON to absolute URLs would have been a one-way change to the only
 * copy of the template library, in a repo that uses `prisma db push` with no migration history and
 * therefore no way back. It would also have made local work impossible: this project can only be
 * verified against the production database, so absolute production URLs in the rows would leave no
 * way to point a local build at anything else.
 *
 * So the mapping lives here, at render time, driven by one environment variable:
 *
 *   unset  -> every path is returned untouched and the site serves from public/, as it does today.
 *   set    -> the four offloaded directories are prefixed with the CDN origin.
 *
 * That makes the cutover and the rollback the same one-line change plus a redeploy, with no data
 * migration on either side.
 *
 * Note NEXT_PUBLIC_ is inlined at build time, so changing it requires a redeploy rather than taking
 * effect on the next request. That is the price of having it work identically on both sides of the
 * server/client boundary, which this needs: the same paths are resolved by the Konva editor in the
 * browser, by SVG rendering that runs in both places, and by sharp and pdfkit on the server.
 */

/**
 * Trimmed deliberately.
 *
 * Vercel dashboard values have twice arrived here with a trailing newline - it split every sitemap
 * <loc> across two lines (see next-sitemap.config.js) and there is a second guard against it in
 * lib/pricing/test-order. A stray newline in an image origin would produce a URL that fails on
 * every asset at once, so it is stripped rather than trusted.
 */
const BASE = (process.env.NEXT_PUBLIC_ASSET_CDN_BASE ?? "").trim().replace(/\/+$/, "");

/**
 * The directories that move. Everything else under public/ stays local, in particular:
 *
 *   images/print  - the only assets rendered through next/image, where an off-origin source would
 *                   mean either paying to optimise a remote fetch or losing optimisation entirely.
 *   fonts         - 4.5 MB, loaded by @font-face, and simpler same-origin.
 */
const OFFLOADED = /^\/images\/(thumbs|card-art|product-art|templates)\//;

/** True when this path is one of the offloaded assets. Exported for tests and guards. */
export function isOffloadedAsset(path: string): boolean {
  return typeof path === "string" && OFFLOADED.test(path);
}

/** Whether an asset CDN is configured at all. */
export const assetCdnConfigured = BASE.length > 0;

/**
 * The URL to load an asset from.
 *
 * A pass-through for anything that is not an offloaded local path: data URIs, already-absolute
 * URLs (customer uploads on UploadThing), and every local asset that stays in the deployment. That
 * matters because several call sites handle a mix - a card's background may be bundled artwork or
 * a file the customer uploaded five minutes ago - and neither should need to know which.
 */
export function assetUrl(path: string): string {
  if (!BASE || !isOffloadedAsset(path)) return path;
  return BASE + path;
}
