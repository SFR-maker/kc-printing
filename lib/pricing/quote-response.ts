import { NextResponse } from "next/server";

/**
 * Cache headers for the three price endpoints.
 *
 * A quote is a pure function of the options in the URL: the tables are compiled into the build,
 * nothing reads the database, and no external service is called. Two customers picking the same
 * 3ft banner get the same number, so there is no reason for the second one to wake a function -
 * particularly since these fire on *every* option change (the rigid-sign picker re-quotes on seven
 * different fields), which made them the busiest routes in the app.
 *
 * An hour rather than a year, deliberately. Prices only change when someone recompiles a scraped
 * table and redeploys, and Vercel's route-handler cache is deployment-scoped, so in principle a
 * redeploy already invalidates this and a year would be safe. That is platform behaviour this
 * project cannot test locally - preview builds do not run here - so the TTL is set to something
 * that fails harmlessly if the assumption is wrong. The alternative, a version token threaded
 * through every request URL, only works while someone remembers to bump it, and a stale token is
 * exactly as wrong as a stale cache with none of the visibility.
 *
 * Worth stating plainly: a stale display price cannot become a stale charge. /api/orders reprices
 * from the same tables server-side before a payment intent is created, so the worst case here is a
 * figure on screen that is at most an hour behind a table nobody edits monthly.
 */
export const QUOTE_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
} as const;

/** A priced result. Cached when it came from GET, uncached when it came from POST. */
export function quoteResponse(body: unknown, cacheable: boolean) {
  return NextResponse.json(body, cacheable ? { headers: QUOTE_CACHE_HEADERS } : undefined);
}

/**
 * The 400 a malformed or unavailable combination gets.
 *
 * Never cached: these are usually a half-finished configuration mid-typing, and caching "that
 * combination isn't available" against a URL the customer is about to complete would be a bug that
 * looks like a broken product.
 */
export function quoteError(raw: unknown) {
  // A quantity of 0 is the picker's "not chosen yet" sentinel, so it lands here as a failed
  // positive() check. "Invalid request" told the customer nothing about what to do next.
  const missingQuantity =
    !raw || typeof raw !== "object" || !Number((raw as Record<string, unknown>).quantity);
  return NextResponse.json(
    {
      valid: false,
      total: 0,
      error: missingQuantity
        ? "Choose a quantity to see your price."
        : "That combination isn't available.",
    },
    { status: 400 },
  );
}

/**
 * Reads a quote spec out of a query string.
 *
 * Numeric fields are converted here rather than with z.coerce so that a missing parameter stays
 * `undefined` and produces the schema's own "required" error, instead of coercing to NaN and
 * failing with something less useful.
 */
export function specFromSearchParams(
  url: string,
  numericFields: readonly string[],
): Record<string, unknown> {
  const { searchParams } = new URL(url);
  const spec: Record<string, unknown> = {};
  for (const [key, value] of searchParams.entries()) {
    spec[key] = numericFields.includes(key) ? Number(value) : value;
  }
  return spec;
}
