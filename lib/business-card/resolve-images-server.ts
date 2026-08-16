import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { assetUrl } from "@/lib/asset-url";
import { isAllowedRemote } from "@/lib/security/allowed-remote-hosts";
import type { CardElement, CardSide } from "./schema";

export { isAllowedRemote };

const REMOTE_TIMEOUT_MS = 20_000;
const MAX_REMOTE_BYTES = 32 * 1024 * 1024;

/**
 * How many distinct remote images one side may pull.
 *
 * The schema permits 150 image elements per side and a PDF resolves both sides, so an adversarial
 * design could drive 300 outbound fetches from a single unauthenticated export. A real card has one
 * or two. The cap bounds the amplification without touching anything a customer would ever build;
 * elements past it keep their original src and simply do not render, which is the same outcome as a
 * fetch that fails.
 */
const MAX_REMOTE_PER_SIDE = 32;

/**
 * Transcoded artwork, kept between requests on a warm instance.
 *
 * Moving assets to R2 turned a ~1ms disk read into a network round trip plus a sharp transcode, on
 * a path that renders every thumbnail and every PDF. The saving grace is that the same few hundred
 * pieces of template artwork are reused across the whole catalogue - so a warm Lambda answers almost
 * everything from here after the first hit.
 *
 * Bounded by total bytes rather than entry count, because the entries are images and their sizes
 * differ by two orders of magnitude. Insertion order is eviction order (a Map iterates in insertion
 * order), and a hit re-inserts to move itself to the back, which makes this a plain LRU.
 */
const CACHE_MAX_BYTES = 96 * 1024 * 1024;
const cache = new Map<string, { dataUri: string; bytes: number }>();
let cacheBytes = 0;

function cacheGet(key: string): string | null {
  const hit = cache.get(key);
  if (!hit) return null;
  cache.delete(key);
  cache.set(key, hit);
  return hit.dataUri;
}

function cachePut(key: string, dataUri: string): void {
  const bytes = dataUri.length;
  // A single item larger than the whole budget would evict everything and still not fit.
  if (bytes > CACHE_MAX_BYTES) return;
  cache.set(key, { dataUri, bytes });
  cacheBytes += bytes;
  for (const [k, v] of cache) {
    if (cacheBytes <= CACHE_MAX_BYTES) break;
    if (k === key) continue;
    cache.delete(k);
    cacheBytes -= v.bytes;
  }
}

const MIME_BY_EXT: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml" };

/**
 * The only image formats the server-side rasterizers can actually decode.
 *
 * Both of them are narrower than a browser. librsvg - which sharp uses to rasterize the SVG this
 * artwork becomes - decodes PNG and JPEG inside an <image> element and silently renders nothing for
 * a WebP one: no error, no warning, just a blank where the photograph should be. pdfkit, on the PDF
 * path, accepts PNG and JPEG and nothing else at all.
 *
 * Every photo template's art is WebP, so every one of them thumbnailed as a blank card while
 * looking correct in the editor, where the browser decodes it fine. That is the worst shape a bug
 * can have: the gallery is the only place most customers ever see these designs, and it was showing
 * them an empty rectangle.
 */
const RASTERIZER_SAFE = new Set(["image/png", "image/jpeg", "image/svg+xml"]);

/**
 * Transcodes anything the rasterizers cannot read into something they can.
 *
 * JPEG when the source is opaque and PNG when it carries alpha: a lossless PNG of a full-bleed
 * photograph runs to megabytes, and a side may hold up to 150 images with both sides resolved for a
 * PDF, so defaulting everything to PNG trades a blank thumbnail for a memory problem. Falls back to
 * the original bytes if sharp cannot read them, which leaves behaviour exactly as it was.
 */
async function toRasterizerSafe(
  buf: Buffer,
  contentType: string
): Promise<{ buf: Buffer; contentType: string }> {
  if (RASTERIZER_SAFE.has(contentType)) return { buf, contentType };
  try {
    const image = sharp(buf);
    const { hasAlpha } = await image.metadata();
    return hasAlpha
      ? { buf: await image.png().toBuffer(), contentType: "image/png" }
      : { buf: await image.jpeg({ quality: 92 }).toBuffer(), contentType: "image/jpeg" };
  } catch {
    return { buf, contentType };
  }
}

/**
 * Fetches an allowlisted remote image and returns it as a data URI, or null.
 *
 * Null rather than throwing, because every caller's correct response to a failure is the same: fall
 * back to whatever it would have done anyway.
 */
async function fetchRemoteAsDataUri(url: string): Promise<string | null> {
  const cached = cacheGet(url);
  if (cached) return cached;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(REMOTE_TIMEOUT_MS) });
    if (!res.ok) return null;
    if (Number(res.headers.get("content-length") ?? 0) > MAX_REMOTE_BYTES) return null;
    const raw = Buffer.from(await res.arrayBuffer());
    if (raw.byteLength > MAX_REMOTE_BYTES) return null;
    const declaredType = res.headers.get("content-type") ?? "image/png";
    if (!declaredType.startsWith("image/")) return null;
    // Customers upload WebP, and so does our own CDN; both fail in the same silent way untranscoded.
    const { buf, contentType } = await toRasterizerSafe(raw, declaredType.split(";")[0].trim());
    const dataUri = `data:${contentType};base64,${buf.toString("base64")}`;
    cachePut(url, dataUri);
    return dataUri;
  } catch {
    return null;
  }
}

/** Inlines image srcs as base64 data URIs so server-side rasterizers (sharp/pdfkit) don't need
 * network access. Split out from render-svg.ts (which is also imported by client components for
 * renderSideToSvg) because this file touches Node's fs module. */
export async function resolveSideImages(side: CardSide): Promise<CardSide> {
  let remoteBudget = MAX_REMOTE_PER_SIDE;

  const elements = await Promise.all(
    side.elements.map(async (el): Promise<CardElement> => {
      if (el.type !== "image" || el.src.startsWith("data:")) return el;
      // A "/"-prefixed src (our own template assets) is either on the CDN or on local disk.
      if (el.src.startsWith("/")) {
        /*
         * CDN first, disk second - and the order matters in both directions.
         *
         * Once the files are removed from public/ the CDN is the only copy, so it has to be tried.
         * But it is attempted *before* the disk read rather than instead of it, and any failure -
         * unset CDN, 404, timeout, DNS - falls straight through to the original local path. That
         * keeps this correct at every stage of the migration: with the env var unset it behaves
         * exactly as it always did, and during the window where both copies exist an R2 outage
         * degrades to the old behaviour instead of blank artwork.
         */
        const remote = assetUrl(el.src);
        if (remote !== el.src && isAllowedRemote(remote) && remoteBudget > 0) {
          remoteBudget -= 1;
          const dataUri = await fetchRemoteAsDataUri(remote);
          if (dataUri) return { ...el, src: dataUri };
        }
        try {
          /*
           * Confined to public/, and verified after resolution.
           *
           * path.join happily normalises "/../.env.local" to a file one level ABOVE public, and the
           * result was read and base64'd straight into the artwork. A design saved through the
           * public POST /api/card-designs and then exported returned the contents of any file in
           * the project - .env.local included, which on this deployment holds a live
           * VERCEL_OIDC_TOKEN. Resolving first and then checking the prefix is what makes this
           * safe: checking the raw src for ".." is the version people get wrong.
           */
          const root = path.resolve(process.cwd(), "public");
          const filePath = path.resolve(root, "." + el.src);
          if (filePath !== root && !filePath.startsWith(root + path.sep)) return el;
          const raw = await fs.readFile(filePath);
          const declaredType = MIME_BY_EXT[path.extname(filePath).toLowerCase()] ?? "image/png";
          const { buf, contentType } = await toRasterizerSafe(raw, declaredType);
          return { ...el, src: `data:${contentType};base64,${buf.toString("base64")}` };
        } catch {
          return el;
        }
      }
      /*
       * Remote srcs get the same guards /api/artwork/inspect already had, and this did not.
       *
       * It was a bare fetch of whatever the client put in the field: no host allowlist, no protocol
       * check, no timeout, no size cap. POST /api/card-designs/export is unauthenticated, so it
       * would fetch any URL on request - a confirmed blind SSRF, including 169.254.169.254, which
       * on a cloud host is the instance credential endpoint. It hung for over ten seconds on that
       * one because nothing bounded it.
       *
       * A side may carry up to 150 image elements and a PDF resolves both sides, so one request
       * could drive 300 outbound fetches with unbounded bodies buffered into memory. The allowlist
       * is the real fix; the timeout and cap stop the amplification.
       */
      if (!isAllowedRemote(el.src)) return el;
      if (remoteBudget <= 0) return el;
      remoteBudget -= 1;
      const dataUri = await fetchRemoteAsDataUri(el.src);
      return dataUri ? { ...el, src: dataUri } : el;
    })
  );
  return { ...side, elements };
}
