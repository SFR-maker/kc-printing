import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

/**
 * A template thumbnail as an image response, rather than base64 inside the gallery's JSON.
 *
 * The gallery used to receive every thumbnail inlined as a data URI. For business cards that was
 * 3.3 MB of JSON on first paint - 2.2 MB of it front thumbnails and 0.9 MB of back thumbnails the
 * gallery never rendered at all - and none of it could be cached, deferred or shared between pages,
 * because a data URI inside a JSON body is not a resource the browser knows anything about.
 *
 * Served from a URL, the same bytes become an ordinary image: `loading="lazy"` actually defers the
 * ones below the fold, the browser caches them across navigations, and the JSON drops to the text
 * the filters need.
 *
 * Public, like the gallery it feeds. These are marketing images for templates anyone can already
 * open in the editor.
 */

/** Thumbnails only change when the template is reseeded, so they can be cached hard. */
const CACHE = "public, max-age=3600, stale-while-revalidate=86400, immutable";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const template = await db.cardTemplate.findUnique({
    where: { slug },
    select: { thumbnailFront: true, thumbnailBack: true },
  });
  if (!template) return new NextResponse("Not found", { status: 404 });

  const stored = template.thumbnailFront ?? template.thumbnailBack;
  if (!stored) return new NextResponse("No thumbnail", { status: 404 });

  /*
   * Thumbnails now live on disk and the column holds a path.
   *
   * They used to be base64 data URIs in the row: about 107 MB of it across the library, in a column
   * every findMany has to read past, uncacheable by anything but this handler, and a third larger
   * than the image it encoded. Served from the file the bytes are 80 MB and the row is a string.
   *
   * Read and served here rather than redirected to the public path: a redirect would cost every
   * thumbnail an extra round trip, and the gallery requests dozens at once.
   */
  if (stored.startsWith("/images/")) {
    // basename only, so a stored value can never walk out of the thumbnails directory.
    const file = path.join(process.cwd(), "public", "images", "thumbs", path.basename(stored));
    try {
      const body = await fs.readFile(file);
      return new NextResponse(body as unknown as BodyInit, {
        headers: {
          "Content-Type": stored.endsWith(".png") ? "image/png" : "image/webp",
          "Content-Length": String(body.byteLength),
          "Cache-Control": CACHE,
        },
      });
    } catch {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  // Legacy rows may still hold an inline data URI until they are next reseeded.
  // [\s\S] rather than the /s flag: the project targets an older lib where dotAll is unavailable.
  const match = stored.match(/^data:([^;]+);base64,([\s\S]*)$/);
  if (!match) return NextResponse.redirect(stored);

  const [, contentType, base64] = match;
  const body = Buffer.from(base64, "base64");

  return new NextResponse(body as unknown as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(body.byteLength),
      "Cache-Control": CACHE,
    },
  });
}
