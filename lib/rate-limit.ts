/**
 * Best-effort in-process rate limiting for unauthenticated endpoints.
 *
 * Serverless means one bucket per warm instance rather than a global one, so this is a speed bump
 * for casual abuse rather than a guarantee. Move to Redis (Upstash) if anything here is targeted
 * properly.
 *
 * Extracted from the contact route so the order endpoint can share it rather than grow a second
 * copy that drifts.
 */

const buckets = new Map<string, Map<string, number[]>>();

export interface RateLimitOptions {
  /** Distinct bucket per endpoint, so a contact form submission cannot exhaust an order allowance. */
  name: string;
  windowMs: number;
  max: number;
}

/** True when this key has already used its allowance inside the window. */
export function rateLimited(key: string, { name, windowMs, max }: RateLimitOptions): boolean {
  const now = Date.now();
  const hits = buckets.get(name) ?? new Map<string, number[]>();
  buckets.set(name, hits);

  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);

  // Bound the map so a spray of unique IPs cannot grow it without limit.
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }
  return false;
}

/**
 * Best available client identifier.
 *
 * Behind Vercel the left-most x-forwarded-for entry is the client; it is spoofable in general, which
 * is another reason this is a speed bump rather than a control.
 */
export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
