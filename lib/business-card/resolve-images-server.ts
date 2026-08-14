import fs from "fs/promises";
import path from "path";
import type { CardElement, CardSide } from "./schema";

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
      try {
        const res = await fetch(el.src);
        if (!res.ok) return el;
        const buf = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get("content-type") ?? "image/png";
        return { ...el, src: `data:${contentType};base64,${buf.toString("base64")}` };
      } catch {
        return el;
      }
    })
  );
  return { ...side, elements };
}
