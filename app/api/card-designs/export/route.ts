import { NextResponse } from "next/server";
import { z } from "zod";
import { CardSideSchema } from "@/lib/business-card/schema";
import { exportCardPdf, exportSidePng } from "@/lib/business-card/export";

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
});

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

  const { front, back, format } = parsed.data;
  if (front.elements.length > MAX_ELEMENTS_PER_SIDE || back.elements.length > MAX_ELEMENTS_PER_SIDE) {
    return NextResponse.json({ error: "Design is too complex to export" }, { status: 413 });
  }

  try {
    if (format === "pdf") {
      const { buffer } = await exportCardPdf(front, back);
      return new NextResponse(buffer as unknown as BodyInit, {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="business-card.pdf"' },
      });
    }
    const side = format === "png-front" ? front : back;
    const { buffer } = await exportSidePng(side);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="business-card-${format === "png-front" ? "front" : "back"}.png"` },
    });
  } catch (err) {
    console.error("Card export failed", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
