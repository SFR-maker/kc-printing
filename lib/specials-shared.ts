/**
 * The parts of the specials feature that a browser is allowed to have.
 *
 * Split from lib/specials.ts because that module imports the Prisma client, and importing a *type*
 * or a *pure function* from it is enough to drag the whole `pg` driver into a client bundle - which
 * fails the build outright with "Can't resolve 'dns'". Anything a client component touches lives
 * here; anything that queries lives there.
 */

/**
 * A special with only the fields the public pages need, already resolved to one language, so
 * nothing internal and nothing in the wrong language leaks into the HTML.
 */
export interface PublicSpecial {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  couponCode: string | null;
  endsAt: Date | null;
}

/**
 * Whether a special is running, for the admin list's status column.
 *
 * Computed in TypeScript rather than queried, because the admin page already holds every row and
 * asking the database again to label each one would be a query per special. The same three
 * conditions the database-side filter in lib/specials uses: switched on, started, not yet ended.
 */
export function specialStatus(
  s: { active: boolean; startsAt: Date | null; endsAt: Date | null },
  now: Date = new Date(),
): "live" | "scheduled" | "expired" | "off" {
  if (!s.active) return "off";
  if (s.startsAt && s.startsAt > now) return "scheduled";
  if (s.endsAt && s.endsAt <= now) return "expired";
  return "live";
}

/**
 * Turns a title into a URL segment.
 *
 * Generated rather than typed so the shop never has to think about it, and stripped to the same
 * character set the anchor links on /specials use.
 */
export function slugifySpecial(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    || "special";
}
