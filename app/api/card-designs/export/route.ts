import { NextResponse } from "next/server";
import { z } from "zod";
import { CardSideSchema } from "@/lib/business-card/schema";
import { exportCardPdf, exportSidePng } from "@/lib/business-card/export";
import { db } from "@/lib/prisma";

const MAX_ELEMENTS_PER_SIDE = 150;

/**
 * Rendering a card to PDF or PNG is the most expensive thing this app does per request, and the
 * endpoint is deliberately unauthenticated so anonymous visitors can export a design before signing
 * up. That combination is a free compute pump, so exports are capped per IP.
 *
 * In-memory, which means per serverless instance rather than global - enough to stop a single
 * client hammering it, not enough to stop a distributed effort. Move to Redis (Upstash) alongside
 * the contact-form limiter if abuse ever shows up in the logs.
 */
const RATE_LIMIT = 20;
const WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    // Cheap sweep so the map cannot grow without bound on a long-lived instance.
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
    }
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

const exportSchema = z.object({
  front: CardSideSchema,
  back: CardSideSchema,
  format: z.enum(["pdf", "png-front", "png-back"]).default("pdf"),
  /**
   * The saved design this export is of, when there is one.
   *
   * Only used to decide whether the output is watermarked. It is not trusted for the *content* -
   * the artwork still comes from the request body, so a bogus id cannot make the server render
   * somebody else's design.
   *
   * `nullish`, not `optional`: an unsaved design has designId === null in the editor store, and
   * `optional()` accepts undefined but rejects null - so every export from a design that had not
   * been saved yet failed validation and came back 400.
   */
  designId: z.string().max(64).nullish(),
});

/**
 * Whether a design has been bought.
 *
 * Paid means an order exists against this design that actually took money. DRAFT and PENDING orders
 * do not count: creating an order row costs nothing, so treating "an order exists" as proof of
 * purchase would let anyone mint a clean export by starting a checkout and abandoning it.
 */
async function isPaidFor(designId: string | null | undefined): Promise<boolean> {
  if (!designId) return false;
  const paid = await db.order.findFirst({
    where: {
      cardDesignId: designId,
      status: { in: ["PAID", "IN_PROGRESS", "REVIEW", "REVISION", "COMPLETE"] },
    },
    select: { id: true },
  });
  return Boolean(paid);
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many exports in a short time. Wait a minute and try again." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = exportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid design", details: parsed.error.flatten() }, { status: 400 });

  const { front, back, format, designId } = parsed.data;
  if (front.elements.length > MAX_ELEMENTS_PER_SIDE || back.elements.length > MAX_ELEMENTS_PER_SIDE) {
    return NextResponse.json({ error: "Design is too complex to export" }, { status: 413 });
  }

  /*
   * Unpurchased exports are watermarked rather than refused.
   *
   * Being able to export before signing up is the point of the studio - it is how someone decides
   * the design is worth buying - but handing back a clean print-ready PDF means the design *is* the
   * product and there is nothing left to pay for. A marked proof lets the customer evaluate it,
   * show it to a colleague and take it to a meeting; it does not let them print it.
   *
   * The mark comes off as soon as the design has been paid for, on this same endpoint.
   */
  const watermark = !(await isPaidFor(designId));

  try {
    if (format === "pdf") {
      const { buffer } = await exportCardPdf(front, back, watermark);
      return new NextResponse(buffer as unknown as BodyInit, {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="business-card${watermark ? "-proof" : ""}.pdf"` },
      });
    }
    const side = format === "png-front" ? front : back;
    const { buffer } = await exportSidePng(side, watermark);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="business-card-${format === "png-front" ? "front" : "back"}${watermark ? "-proof" : ""}.png"` },
    });
  } catch (err) {
    console.error("Card export failed", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
