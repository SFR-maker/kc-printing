import { z } from "zod";
import { calculateWindowDecalPrice } from "@/lib/pricing/window-decals-server";
import { quoteError, quoteResponse, specFromSearchParams } from "@/lib/pricing/quote-response";
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

const NUMERIC = ["sizeId", "shapeId", "quantity"] as const;

function quote(input: unknown, cacheable: boolean) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return quoteError(input);
  return quoteResponse(calculateWindowDecalPrice(parsed.data as WindowDecalSpec), cacheable);
}

/** Cacheable: the quote is a pure function of the query string. See quote-response. */
export async function GET(req: Request) {
  return quote(specFromSearchParams(req.url, NUMERIC), true);
}

/** Kept so an older cached client bundle keeps working after the GET migration. */
export async function POST(req: Request) {
  return quote(await req.json().catch(() => null), false);
}
