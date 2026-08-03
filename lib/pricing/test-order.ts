import { timingSafeEqual } from "node:crypto";

/**
 * A zero-cost order used to exercise the real upload -> proof -> checkout path on the live site.
 *
 * Uploads, artwork inspection and Stripe Checkout can only be properly verified against production,
 * but the shop is public, so a visible "free business cards" product would simply be ordered. The
 * option is therefore unlisted and gated on a secret carried in the URL:
 *
 *     /services/business-cards/order?test=<TEST_ORDER_CODE>
 *
 * `TEST_ORDER_CODE` is a server-only environment variable. The order page reads it during server
 * rendering, so the secret is never compiled into the client bundle; the browser only ever holds
 * the copy the operator typed into the address bar themselves. Every price is recomputed in
 * `/api/orders` regardless, and that route re-checks the code before zeroing anything, so a
 * tampered client cannot talk itself into a free order.
 *
 * Server-only: importing this from a client component pulls in `node:crypto` and fails the build,
 * which is the correct outcome.
 */

/** Query parameter carrying the code. */
export const TEST_ORDER_PARAM = "test";

/** Short codes are guessable, so the feature stays off rather than being weakly protected. */
const MIN_CODE_LENGTH = 16;

/**
 * True when `code` matches `TEST_ORDER_CODE`.
 *
 * Returns false whenever the variable is unset or too short, so the free path simply does not exist
 * unless someone has deliberately configured it. The trim guards against the trailing newline
 * Vercel's dashboard leaves on pasted values - the same newline that once broke every checkout by
 * making `success_url` invalid.
 */
export function isTestOrderCode(code: string | null | undefined): boolean {
  const expected = process.env.TEST_ORDER_CODE?.trim();
  if (!expected || expected.length < MIN_CODE_LENGTH) return false;
  if (!code) return false;

  const supplied = Buffer.from(code.trim(), "utf8");
  const secret = Buffer.from(expected, "utf8");
  // timingSafeEqual throws on a length mismatch, and the length itself is not worth protecting.
  if (supplied.length !== secret.length) return false;
  return timingSafeEqual(supplied, secret);
}
