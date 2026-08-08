import { NextResponse } from "next/server";
import { z } from "zod";
import { inspectArtwork, ArtworkRejectedError, assertAcceptedFormat } from "@/lib/business-card/inspect-artwork";
import { printSpec } from "@/lib/print/spec";

const schema = z.object({
  url: z.string().url(),
  fileName: z.string().min(1).max(300),
  roundCorners: z.boolean().default(false),
  /**
   * Which product and finished size the file is being measured against.
   *
   * Defaults to a business card so existing callers keep working unchanged. Everything else has to
   * say what it is, because the resolution floor and the bleed are properties of the product - a
   * banner prints at 150 DPI and would fail a card's 300 floor on artwork the press accepts.
   */
  product: z.enum(["business-cards", "postcards", "banners", "rigid-signs", "window-decals"]).default("business-cards"),
  trimWidthIn: z.number().positive().max(600).optional(),
  trimHeightIn: z.number().positive().max(600).optional(),
});

/**
 * Only files we put in storage ourselves are fetchable. Without this the endpoint is an SSRF
 * primitive: an attacker could point it at internal addresses and learn about them from the
 * different error shapes. UploadThing serves from these hosts.
 */
const ALLOWED_HOSTS = [/^utfs\.io$/, /^uploadthing\.com$/, /\.uploadthing\.com$/, /\.ufs\.sh$/];

/** UploadThing caps uploads at 32MB; refuse anything larger rather than buffering it. */
const MAX_BYTES = 32 * 1024 * 1024;

function hostAllowed(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    return ALLOWED_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { url, fileName, roundCorners, product, trimWidthIn, trimHeightIn } = parsed.data;

  if (!hostAllowed(url)) {
    return NextResponse.json({ error: "That file location isn't supported." }, { status: 400 });
  }

  // Reject unreadable formats before spending a download on them.
  try {
    assertAcceptedFormat(fileName);
  } catch (err) {
    if (err instanceof ArtworkRejectedError) {
      return NextResponse.json({ error: err.message, rejected: true }, { status: 422 });
    }
    throw err;
  }

  let bytes: Buffer;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) {
      return NextResponse.json({ error: "We couldn't retrieve that file. Please try uploading it again." }, { status: 502 });
    }
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) {
      return NextResponse.json({ error: "That file is too large (32MB max)." }, { status: 413 });
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "That file is too large (32MB max)." }, { status: 413 });
    }
    bytes = buf;
  } catch {
    return NextResponse.json({ error: "We couldn't retrieve that file. Please try uploading it again." }, { status: 502 });
  }

  try {
    // Rounded-corner cards are die-cut rather than guillotined, and the die has more positional
    // play, so that one finish widens the bleed.
    const spec = printSpec(
      product,
      trimWidthIn ?? 3.5,
      trimHeightIn ?? 2,
      product === "business-cards" && roundCorners ? 0.1625 : undefined
    );
    const inspection = await inspectArtwork(bytes, fileName, spec);
    return NextResponse.json(inspection);
  } catch (err) {
    if (err instanceof ArtworkRejectedError) {
      return NextResponse.json({ error: err.message, rejected: true }, { status: 422 });
    }
    console.error("Artwork inspection failed:", err);
    return NextResponse.json(
      { error: "We couldn't read that file. Please re-export it as a PDF or 300 DPI PNG and try again." },
      { status: 500 }
    );
  }
}
