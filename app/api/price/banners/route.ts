import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateBannerPrice } from "@/lib/pricing/banners-server";
import { grommetPrice, isGrommetPriced } from "@/lib/pricing/banner-finishing-server";

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

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ valid: false, total: 0, error: "Invalid request" }, { status: 400 });
  }
  const { size, material, quantity, grommets } = parsed.data;

  const base = calculateBannerPrice({ size, material, quantity });
  if (!base.valid) return NextResponse.json(base);

  // An unquoted finishing choice is refused rather than treated as free: print sells at cost, so a
  // silent zero is a loss on the job.
  if (grommets !== "No Grommets" && !isGrommetPriced(size, grommets, quantity)) {
    return NextResponse.json({
      valid: false,
      total: 0,
      error: "That grommet option isn't available for this size and quantity.",
    });
  }

  const finishing = grommetPrice(size, grommets, quantity);
  return NextResponse.json({
    valid: true,
    total: Math.round((base.total + finishing) * 100) / 100,
    base: base.total,
    finishing,
  });
}
