import { NextResponse } from "next/server";
import { z } from "zod";
import { inspectArtwork, ArtworkRejectedError, assertAcceptedFormat } from "@/lib/business-card/inspect-artwork";

const schema = z.object({
  url: z.string().url(),
  fileName: z.string().min(1).max(300),
  roundCorners: z.boolean().default(false),
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

  const { url, fileName, roundCorners } = parsed.data;

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
    const inspection = await inspectArtwork(bytes, fileName, roundCorners);
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
