import { NextResponse } from "next/server";
import { z } from "zod";
import { easypostConfigured, getRates, serviceLabel } from "@/lib/shipping/easypost";
import { businessCardParcel, formatWeight } from "@/lib/shipping/parcel";
import { getPricingSettings } from "@/lib/pricing/settings-server";
import { transitLabel } from "@/lib/shipping/rates";

/**
 * Quotes shipping before checkout.
 *
 * Stripe collects the delivery address on its own page, which is too late to price anything, so the
 * customer gives us a ZIP here and we rate against it. Only a ZIP: it is enough for every US
 * carrier to price a parcel, and asking for a full street address before someone has decided to buy
 * is friction that costs more orders than it saves.
 *
 * Public by design - it is a price quote, the same information the shop advertises. Rating is
 * capped per IP because each call costs an EasyPost request.
 */

const schema = z.object({
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, "Enter a 5-digit ZIP code"),
  spec: z.object({
    sizeId: z.number(),
    paperId: z.number(),
    quantity: z.number().int().positive(),
  }),
});

const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

function limited(ip: string): boolean {
  const now = Date.now();
  const e = hits.get(ip);
  if (!e || now > e.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    if (hits.size > 5000) for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
    return false;
  }
  e.count++;
  return e.count > RATE_LIMIT;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limited(ip)) {
    return NextResponse.json({ error: "Too many quotes. Wait a moment." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const { zip, spec } = parsed.data;
  const parcel = businessCardParcel(spec.sizeId, spec.paperId, spec.quantity);
  const settings = await getPricingSettings();

  // Flat tiers whenever live rating is unavailable, so the customer always sees a price. A checkout
  // that cannot quote shipping is worse than one quoting a flat rate.
  const fallback = () =>
    NextResponse.json({
      source: "flat" as const,
      weight: formatWeight(parcel.weightOz),
      options: settings.shippingTiers.map((t) => ({
        id: t.id,
        label: t.label,
        transit: transitLabel(t),
        price: t.price,
        recommended: Boolean(t.recommended),
      })),
    });

  if (!easypostConfigured()) return fallback();

  const rates = await getRates(
    { street1: "", city: "", state: "", zip, country: "US" },
    parcel
  );
  if (!rates.length) return fallback();

  // Cheapest per carrier-service, and only a handful: a list of nineteen options is not a choice,
  // it is a decision the customer did not ask to make.
  const options = rates.slice(0, 4).map((r, i) => ({
    id: r.id,
    label: serviceLabel(r),
    transit: r.deliveryDays
      ? `${r.deliveryDays} business day${r.deliveryDays === 1 ? "" : "s"}`
      : "estimate not given",
    price: round2(r.price + settings.shippingMarkup),
    recommended: i === 0,
  }));

  return NextResponse.json({ source: "live" as const, weight: formatWeight(parcel.weightOz), options });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
