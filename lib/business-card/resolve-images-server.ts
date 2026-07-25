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
          const filePath = path.join(process.cwd(), "public", el.src);
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
