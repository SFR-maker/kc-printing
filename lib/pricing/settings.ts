import { SHIPPING_TIERS, type ShippingTier } from "@/lib/shipping/rates";

/**
 * Every price lever the shop owner can pull without a deploy.
 *
 * The underlying print cost table (lib/pricing/business-card-data.json) stays in code - it is 270
 * size/paper/colour combinations scraped from a supplier and is not something anyone edits by hand.
 * What the owner actually needs to change is the margin applied on top, the flat fees, and shipping,
 * so those are the values held here and overridden from the database.
 *
 * This module is deliberately free of database imports so the same shape can be handed to client
 * components as props. Reading the stored values is `lib/pricing/settings-server.ts`.
 */
export interface PricingSettings {
  /** Multiplier applied to the supplier's base print cost. 1.25 = a 25% margin. */
  markupMultiplier: number;
  /** Multiplier applied to the round-corner die-cut cost table. */
  roundCornersMarkup: number;
  /** Flat fee for a human-checked proof. The instant proof is free. */
  manualProofPrice: number;
  /** Flat-rate delivery speeds offered at checkout. */
  shippingTiers: ShippingTier[];
}

export const DEFAULT_PRICING: PricingSettings = {
  markupMultiplier: 1.25,
  roundCornersMarkup: 1.25,
  manualProofPrice: 3,
  shippingTiers: SHIPPING_TIERS,
};

/** SiteSetting keys. Namespaced so unrelated settings can share the table. */
export const PRICING_KEYS = {
  markupMultiplier: "pricing.markupMultiplier",
  roundCornersMarkup: "pricing.roundCornersMarkup",
  manualProofPrice: "pricing.manualProofPrice",
  shippingTiers: "pricing.shippingTiers",
} as const;

/**
 * Bounds on what the editor will accept.
 *
 * A markup below 1 sells at a loss on every order, and a typo of 125 instead of 1.25 would quote
 * five-figure business cards. Both are far more likely than a legitimate value outside this range,
 * so the form refuses them rather than trusting a number typed into a browser.
 */
export const PRICING_LIMITS = {
  markupMultiplier: { min: 1, max: 5 },
  roundCornersMarkup: { min: 1, max: 5 },
  manualProofPrice: { min: 0, max: 100 },
  shippingPrice: { min: 0, max: 500 },
  businessDays: { min: 1, max: 60 },
} as const;

/** Parses stored strings back into settings, falling back to the default on anything unusable. */
export function parsePricingSettings(rows: { key: string; value: string }[]): PricingSettings {
  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  const num = (key: string, fallback: number, limits: { min: number; max: number }): number => {
    const raw = byKey.get(key);
    if (raw === undefined) return fallback;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < limits.min || parsed > limits.max) return fallback;
    return parsed;
  };

  return {
    markupMultiplier: num(PRICING_KEYS.markupMultiplier, DEFAULT_PRICING.markupMultiplier, PRICING_LIMITS.markupMultiplier),
    roundCornersMarkup: num(PRICING_KEYS.roundCornersMarkup, DEFAULT_PRICING.roundCornersMarkup, PRICING_LIMITS.roundCornersMarkup),
    manualProofPrice: num(PRICING_KEYS.manualProofPrice, DEFAULT_PRICING.manualProofPrice, PRICING_LIMITS.manualProofPrice),
    shippingTiers: parseShippingTiers(byKey.get(PRICING_KEYS.shippingTiers)),
  };
}

/**
 * Shipping tiers are stored as JSON, so a malformed value must never take checkout down. Anything
 * that does not parse into a usable list falls back to the tiers compiled into the build.
 */
export function parseShippingTiers(raw: string | undefined): ShippingTier[] {
  if (!raw) return DEFAULT_PRICING.shippingTiers;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PRICING.shippingTiers;

    const tiers = parsed.filter(isShippingTier);
    if (tiers.length !== parsed.length) return DEFAULT_PRICING.shippingTiers;

    // Stripe preselects the first option it is given, and buildShippingOptions promotes the
    // recommended one. More than one recommendation is ambiguous, so treat it as corrupt.
    if (tiers.filter((t) => t.recommended).length > 1) return DEFAULT_PRICING.shippingTiers;
    if (new Set(tiers.map((t) => t.id)).size !== tiers.length) return DEFAULT_PRICING.shippingTiers;

    return tiers;
  } catch {
    return DEFAULT_PRICING.shippingTiers;
  }
}

function isShippingTier(value: unknown): value is ShippingTier {
  if (typeof value !== "object" || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === "string" && t.id.length > 0 &&
    typeof t.label === "string" && t.label.length > 0 &&
    typeof t.price === "number" && Number.isFinite(t.price) &&
    t.price >= PRICING_LIMITS.shippingPrice.min && t.price <= PRICING_LIMITS.shippingPrice.max &&
    typeof t.minBusinessDays === "number" && typeof t.maxBusinessDays === "number" &&
    t.minBusinessDays >= PRICING_LIMITS.businessDays.min &&
    t.maxBusinessDays <= PRICING_LIMITS.businessDays.max &&
    t.minBusinessDays <= t.maxBusinessDays
  );
}
