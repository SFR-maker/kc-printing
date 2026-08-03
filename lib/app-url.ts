/**
 * The site's public base URL, always safe to concatenate onto.
 *
 * Never read `process.env.NEXT_PUBLIC_APP_URL` directly. The deployed value carries a trailing
 * newline, which is invisible in most places but not all: `new URL()` normalises it away, so
 * metadata and canonicals looked fine, while string interpolation quietly produced
 * "https://host\n/success?..." — Stripe rejected that with `url_invalid` on `success_url` and every
 * checkout in production failed with "we couldn't start checkout". next-sitemap hit the same thing
 * and emitted 19 broken <loc> entries.
 *
 * Trimmed and stripped of trailing slashes here so a stray character in the environment can only
 * ever be wrong in one place.
 */
export const APP_URL: string = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
  .trim()
  .replace(/\/+$/, "");

/** Builds an absolute URL onto the site's origin. Pass a path with or without a leading slash. */
export function absoluteUrl(path: string): string {
  return `${APP_URL}/${path.replace(/^\/+/, "")}`;
}
