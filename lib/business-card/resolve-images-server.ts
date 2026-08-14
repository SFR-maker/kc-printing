import fs from "fs/promises";
import path from "path";
import type { CardElement, CardSide } from "./schema";

/**
 * Hosts a design may reference. Matches the uploader's own domains and nothing else, so a design
 * can only point at files this shop actually stores.
 */
const ALLOWED_REMOTE_HOSTS = [/^utfs\.io$/, /^uploadthing\.com$/, /\.uploadthing\.com$/, /\.ufs\.sh$/];
const REMOTE_TIMEOUT_MS = 20_000;
const MAX_REMOTE_BYTES = 32 * 1024 * 1024;

export function isAllowedRemote(src: string): boolean {
  try {
    const u = new URL(src);
    // https only: http would allow a downgrade to a plaintext internal address.
    if (u.protocol !== "https:") return false;
    return ALLOWED_REMOTE_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

const MIME_BY_EXT: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml" };

/** Inlines image srcs as base64 data URIs so server-side rasterizers (sharp/pdfkit) don't need
 * network access. Split out from render-svg.ts (which is also imported by client components for
 * renderSideToSvg) because this file touches Node's fs module. */
export async function resolveSideImages(side: CardSide): Promise<CardSide> {
  const elements = await Promise.all(
    side.elements.map(async (el): Promise<CardElement> => {
      if (el.type !== "image" || el.src.startsWith("data:")) return el;
      // A "/"-prefixed src (our own bundled template assets under public/) has no origin to fetch()
      // against outside a running server request — read it straight off disk instead.
      if (el.src.startsWith("/")) {
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
          const buf = await fs.readFile(filePath);
          const contentType = MIME_BY_EXT[path.extname(filePath).toLowerCase()] ?? "image/png";
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
      try {
        const res = await fetch(el.src, { signal: AbortSignal.timeout(REMOTE_TIMEOUT_MS) });
        if (!res.ok) return el;
        const declared = Number(res.headers.get("content-length") ?? 0);
        if (declared > MAX_REMOTE_BYTES) return el;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength > MAX_REMOTE_BYTES) return el;
        const contentType = res.headers.get("content-type") ?? "image/png";
        if (!contentType.startsWith("image/")) return el;
        return { ...el, src: `data:${contentType};base64,${buf.toString("base64")}` };
      } catch {
        return el;
      }
    })
  );
  return { ...side, elements };
}
