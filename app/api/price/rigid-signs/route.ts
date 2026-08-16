import { z } from "zod";
import { calculateRigidSignPrice } from "@/lib/pricing/rigid-signs-server";
import { quoteError, quoteResponse, specFromSearchParams } from "@/lib/pricing/quote-response";
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

const NUMERIC = ["sizeId", "shapeId", "quantity"] as const;

function quote(input: unknown, cacheable: boolean) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return quoteError(input);
  return quoteResponse(calculateRigidSignPrice(parsed.data as RigidSignSpec), cacheable);
}

/** Cacheable: the quote is a pure function of the query string. See quote-response. */
export async function GET(req: Request) {
  return quote(specFromSearchParams(req.url, NUMERIC), true);
}

/** Kept so an older cached client bundle keeps working after the GET migration. */
export async function POST(req: Request) {
  return quote(await req.json().catch(() => null), false);
}
