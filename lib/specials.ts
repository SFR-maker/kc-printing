import "server-only";

import { db } from "@/lib/prisma";
import type { Special } from "@prisma/client";
import type { PublicSpecial } from "./specials-shared";
import type { Locale } from "@/lib/i18n/config";

/**
 * Which promotions are live, and where they show.
 *
 * "Live" is three conditions, not one: the special has to be switched on, its start date has to have
 * passed (or be absent), and its end date has to be in the future (or be absent). Deciding that at
 * read time rather than storing a `live` flag is what lets the shop write next month's sale today
 * and have it appear on its own - and, more importantly, disappear on its own, which is the half
 * people forget. A shop that has to remember to switch a promotion off ends up advertising a
 * Christmas discount in March.
 *
 * The window is evaluated in the database rather than in JavaScript so the /specials page and the
 * promo bar cannot disagree about the current time, and so a page can stay cached on `revalidate`
 * without holding a stale idea of what is running.
 *
 * `server-only`, because this imports the Prisma client: a client component reaching for anything in
 * here drags the entire `pg` driver into the browser bundle, which fails the build with a
 * module-not-found on `dns`. The pure half lives in lib/specials-shared and is safe to import
 * anywhere.
 */

export type { PublicSpecial } from "./specials-shared";
export { specialStatus, slugifySpecial } from "./specials-shared";

/**
 * Picks the copy for one language, falling back to English field by field.
 *
 * Per field rather than all-or-nothing: a shop that translated the headline but not the body should
 * get the Spanish headline, not be pushed back to English entirely for the sake of consistency.
 * An empty string counts as untranslated, since that is what an admin form sends for a field
 * somebody opened and left blank.
 */
function toPublic(s: Special, locale: Locale): PublicSpecial {
  const pick = (es: string | null, en: string) => (locale === "es" && es?.trim() ? es : en);
  const pickOptional = (es: string | null, en: string | null) =>
    (locale === "es" && es?.trim() ? es : en);

  return {
    id: s.id,
    slug: s.slug,
    title: pick(s.titleEs, s.title),
    blurb: pick(s.blurbEs, s.blurb),
    body: pickOptional(s.bodyEs, s.body),
    imageUrl: s.imageUrl,
    ctaLabel: pickOptional(s.ctaLabelEs, s.ctaLabel),
    ctaHref: s.ctaHref,
    couponCode: s.couponCode,
    endsAt: s.endsAt,
  };
}

/** The Prisma filter for "running right now", shared so the bar and the page cannot drift apart. */
function liveWhere(now: Date) {
  return {
    active: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
    ],
  };
}

/** Everything currently running, in the order the shop ranked them. */
export async function getLiveSpecials(locale: Locale = "en", now: Date = new Date()): Promise<PublicSpecial[]> {
  const rows = await db.special.findMany({
    where: liveWhere(now),
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return rows.map((r) => toPublic(r, locale));
}

/**
 * The one special the site-wide bar shows, or null.
 *
 * One rather than all of them: the bar is a single strip above the header, and rotating or stacking
 * promotions there turns the top of every page into an advert. The shop chooses which one leads by
 * ranking it first.
 */
export async function getBarSpecial(locale: Locale = "en", now: Date = new Date()): Promise<PublicSpecial | null> {
  const row = await db.special.findFirst({
    where: { ...liveWhere(now), showInBar: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return row ? toPublic(row, locale) : null;
}
