import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { db } from "@/lib/prisma";
import { CardSideSchema } from "@/lib/business-card/schema";
import { exportCardPdf, exportSidePng } from "@/lib/business-card/export";

/**
 * Downloads the print file for an order that was designed in the Design Studio.
 *
 * The public export endpoint takes a design as JSON, which is right for the editor but no use to
 * the shop: production has an order number, not a design payload. This resolves the order to its
 * design and renders through the same pipeline, so what the shop downloads is exactly what the
 * customer approved.
 *
 *   /api/admin/orders/{id}/print-file            -> both sides as PDF
 *   /api/admin/orders/{id}/print-file?side=front -> a single face as PNG
 */

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // requireAdmin resolves to { error, user } and never throws, so it has to be destructured. An
  // earlier `.catch(() => null)` guard always saw a truthy object and let anonymous callers through
  // to a customer's print file.
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    select: { id: true, cardDesign: { select: { id: true, title: true, front: true, back: true } } },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!order.cardDesign) {
    return NextResponse.json({ error: "This order has no Design Studio artwork" }, { status: 404 });
  }

  // The stored JSON is validated rather than trusted: a design saved under an older schema version
  // would otherwise reach the renderer half-formed and fail deep inside it.
  const front = CardSideSchema.safeParse(order.cardDesign.front);
  const back = CardSideSchema.safeParse(order.cardDesign.back);
  if (!front.success || !back.success) {
    return NextResponse.json({ error: "This design could not be read for printing" }, { status: 422 });
  }

  const slug = (order.cardDesign.title || "design").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const side = new URL(req.url).searchParams.get("side");

  try {
    if (side === "front" || side === "back") {
      const { buffer } = await exportSidePng(side === "front" ? front.data : back.data);
      return new NextResponse(buffer as unknown as BodyInit, {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${slug}-${side}.png"`,
        },
      });
    }
    const { buffer } = await exportCardPdf(front.data, back.data);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${slug}-print.pdf"`,
      },
    });
  } catch (err) {
    console.error(`Print file export failed for order ${id}`, err);
    return NextResponse.json({ error: "Could not produce the print file" }, { status: 500 });
  }
}
