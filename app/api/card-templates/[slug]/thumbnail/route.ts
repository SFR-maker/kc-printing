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
   * Thumbnails are stored as data URIs, so the bytes have to be recovered from the base64 rather
   * than streamed. Anything that is not a data URI is treated as an ordinary URL and redirected to,
   * which keeps the door open for moving these to object storage later without changing callers.
   */
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
