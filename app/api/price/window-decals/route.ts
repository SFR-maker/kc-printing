import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateWindowDecalPrice } from "@/lib/pricing/window-decals-server";
import type { WindowMaterialId, WindowDecalSpec } from "@/lib/pricing/window-decals";

/**
 * Quotes window signage.
 *
 * Same split as rigid signs: the options a customer picks between are bundled
 * (lib/pricing/window-decals, 51 KB); the 14,391 prices stay here.
 *
 * Public, like the rest of the ordering flow: a price is what the storefront already displays, and
 * the order route prices independently before taking payment rather than trusting anything a client
 * sends.
 */

const MATERIALS = [
  "window-decals", "window-clings", "window-perfs",
] as const satisfies readonly WindowMaterialId[];

const schema = z.object({
  material: z.enum(MATERIALS),
  sizeId: z.number().int().positive(),
  shapeId: z.number().int().positive(),
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

  const price = calculateWindowDecalPrice(parsed.data as WindowDecalSpec);
  return NextResponse.json(price);
}
