/**
 * Cache tag names, in one place.
 *
 * These are the handle between a cached read and the admin write that has to invalidate it. Both
 * halves are easy to write and easy to get subtly wrong: a tag typo'd on the write side fails
 * silently and leaves the shop looking at stale data until the TTL expires, with nothing in the
 * logs to say so. Naming them once means the compiler catches what a string literal would not.
 *
 * Note on the API: this uses `unstable_cache` rather than Next 16's `use cache` directive, which
 * has replaced it. `use cache` is a Cache Components feature and requires `cacheComponents: true`
 * in next.config - a project-wide flag that changes rendering semantics for all ~110 routes at
 * once. That is worth doing deliberately, not as a side effect of adding a cache to three reads.
 * When it happens, these tags carry over to `cacheTag()` unchanged.
 */

/** The site-wide promo bar and the offers page. Invalidated by any admin write to a Special. */
export const SPECIALS_TAG = "specials";

/** Margin, flat fees and shipping tiers from /admin/pricing. */
export const PRICING_TAG = "pricing-settings";

/** Template rows behind the "start from a design" rails. */
export const TEMPLATES_TAG = "templates";
