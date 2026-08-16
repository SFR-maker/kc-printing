import { z } from "zod";
import { calculateBannerPrice } from "@/lib/pricing/banners-server";
import { grommetPrice, isGrommetPriced } from "@/lib/pricing/banner-finishing-server";
import { quoteError, quoteResponse, specFromSearchParams } from "@/lib/pricing/quote-response";

/**
 * Quotes a banner, including its finishing.
 *
 * The price table is 13,530 figures across 110 sizes and roughly 1.1MB, so it stays on the server -
 * the same arrangement rigid signs use. The options a customer picks between are bundled
 * (lib/pricing/banners, 2KB).
 *
 * Public, like the rest of the ordering flow: a price is what the storefront already displays, and
 * the order route prices independently before taking payment rather than trusting anything a client
 * sends.
 */

const schema = z.object({
  size: z.string().max(60),
  material: z.string().max(80),
  quantity: z.number().int().positive().max(100_000),
  grommets: z.string().max(60).default("No Grommets"),
});

const NUMERIC = ["quantity"] as const;

function quote(input: unknown, cacheable: boolean) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return quoteError(input);
  const { size, material, quantity, grommets } = parsed.data;

  const base = calculateBannerPrice({ size, material, quantity });
  if (!base.valid) return quoteResponse(base, cacheable);

  // An unquoted finishing choice is refused rather than treated as free: print sells at cost, so a
  // silent zero is a loss on the job.
  if (grommets !== "No Grommets" && !isGrommetPriced(size, grommets, quantity)) {
    return quoteResponse(
      {
        valid: false,
        total: 0,
        error: "That grommet option isn't available for this size and quantity.",
      },
      cacheable,
    );
  }

  const finishing = grommetPrice(size, grommets, quantity);
  return quoteResponse(
    {
      valid: true,
      total: Math.round((base.total + finishing) * 100) / 100,
      base: base.total,
      finishing,
    },
    cacheable,
  );
}

/** Cacheable: the quote is a pure function of the query string. See quote-response. */
export async function GET(req: Request) {
  return quote(specFromSearchParams(req.url, NUMERIC), true);
}

/** Kept so an older cached client bundle keeps working after the GET migration. */
export async function POST(req: Request) {
  return quote(await req.json().catch(() => null), false);
}
