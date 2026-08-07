import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateRigidSignPrice } from "@/lib/pricing/rigid-signs-server";
import type { RigidMaterialId, RigidSignSpec } from "@/lib/pricing/rigid-signs";

/**
 * Quotes a rigid sign.
 *
 * Business cards, banners and postcards price in the browser from a bundled table, but the five
 * rigid-sign tables hold 57,293 quoted prices across roughly two megabytes - far too much to ship to
 * a page. The options a customer picks between are bundled (lib/pricing/rigid-signs, 63 KB); the
 * prices stay here.
 *
 * Public, like the rest of the ordering flow: a price is what the storefront already displays, and
 * the order route prices independently before taking payment rather than trusting anything a client
 * sends.
 */

const MATERIALS = [
  "yard-signs", "corrugated-boards", "pvc-boards", "foam-boards", "aluminum-boards",
] as const satisfies readonly RigidMaterialId[];

const schema = z.object({
  material: z.enum(MATERIALS),
  sizeId: z.number().int().positive(),
  shapeId: z.number().int().positive(),
  thickness: z.string().max(8),
  type: z.string().max(8),
  color: z.string().max(8),
  quantity: z.number().int().positive().max(100_000),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // A quantity of 0 is the picker's "not chosen yet" sentinel, so it lands here as a failed
    // positive() check. "Invalid request" told the customer nothing about what to do next.
    const missingQuantity = !body || typeof body !== "object" || !Number((body as Record<string, unknown>).quantity);
    return NextResponse.json(
      {
        valid: false,
        total: 0,
        error: missingQuantity ? "Choose a quantity to see your price." : "That combination isn't available.",
      },
      { status: 400 },
    );
  }

  const price = calculateRigidSignPrice(parsed.data as RigidSignSpec);
  return NextResponse.json(price);
}
