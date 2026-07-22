import { NextResponse } from "next/server";
import { z } from "zod";
import { CardSideSchema } from "@/lib/business-card/schema";
import { exportCardPdf, exportSidePng } from "@/lib/business-card/export";

const MAX_ELEMENTS_PER_SIDE = 150;

const exportSchema = z.object({
  front: CardSideSchema,
  back: CardSideSchema,
  format: z.enum(["pdf", "png-front", "png-back"]).default("pdf"),
});

export async function POST(req: Request) {
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
