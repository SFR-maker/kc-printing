/**
 * Locales, and the mapping between an English URL and its Spanish twin.
 *
 * Spanish gets real URLs (/es/servicios/calcomanias-para-ventanas) rather than a client-side string
 * swap, because the entire point of translating a storefront is that somebody searching in Spanish
 * finds it. A toggle that rewrites text in the browser is invisible to a crawler - there is one URL,
 * it returns English, and that is what gets indexed.
 *
 * Paths are translated too, not just page content. `/es/services/window-decals` would rank for
 * nothing: the words in a URL are part of what a search engine matches on, and a Spanish speaker
 * looking for window decals is typing "calcomanías para ventanas".
 *
 * This module is deliberately free of React and of any database import, so middleware, the sitemap
 * generator, server components and client components can all share one source of truth about which
 * URL corresponds to which.
 */

export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** The `lang` attribute and the hreflang code for each locale. */
export const HTML_LANG: Record<Locale, string> = {
  en: "en-US",
  es: "es-US",
};

export const LOCALE_LABEL: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

/**
 * Every translated route, English path to Spanish segment path.
 *
 * Kept as an explicit table rather than derived from the filesystem so that a page existing in one
 * language and not the other is a visible gap here rather than a 404 discovered by a customer.
 * Order pages and the design studio are deliberately absent - see ORDER_FLOW_LOCALE below.
 */
export const ROUTE_MAP: Record<string, string> = {
  "/": "/es",
  "/services": "/es/servicios",
  "/services/business-cards": "/es/servicios/tarjetas-de-presentacion",
  "/services/postcards": "/es/servicios/postales",
  "/services/banners": "/es/servicios/lonas-publicitarias",
  "/services/rigid-signs": "/es/servicios/letreros-rigidos",
  "/services/window-decals": "/es/servicios/calcomanias-para-ventanas",
  "/specials": "/es/especiales",
  "/pricing": "/es/precios",
  "/about": "/es/nosotros",
  "/contact": "/es/contacto",
  "/faq": "/es/preguntas-frecuentes",
  "/portfolio": "/es/portafolio",
};

/** The reverse lookup, built once rather than searched per call. */
const REVERSE_ROUTE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(ROUTE_MAP).map(([en, es]) => [es, en]),
);

/**
 * Service slugs, English to Spanish.
 *
 * Separate from ROUTE_MAP because the Spanish service pages are one dynamic route rather than five
 * files, so `[slug]` has to resolve a Spanish slug back to the English key that lib/service-data and
 * lib/pricing are both keyed by.
 */
export const SERVICE_SLUG_ES: Record<string, string> = {
  "business-cards": "tarjetas-de-presentacion",
  postcards: "postales",
  banners: "lonas-publicitarias",
  "rigid-signs": "letreros-rigidos",
  "window-decals": "calcomanias-para-ventanas",
};

const SERVICE_SLUG_FROM_ES: Record<string, string> = Object.fromEntries(
  Object.entries(SERVICE_SLUG_ES).map(([en, es]) => [es, en]),
);

/** The English service slug a Spanish one refers to, or null if it is not a service. */
export function serviceSlugFromEs(esSlug: string): string | null {
  return SERVICE_SLUG_FROM_ES[esSlug] ?? null;
}

/** Which locale a path belongs to. Everything under /es is Spanish; everything else is English. */
export function localeFromPath(pathname: string): Locale {
  return pathname === "/es" || pathname.startsWith("/es/") ? "es" : "en";
}

/**
 * The same page in the other locale, or null when it has no translation.
 *
 * Null rather than a guess: sending someone from the English order page to a Spanish URL that does
 * not exist is worse than not offering the switch, and it is what makes the language switcher able
 * to hide itself on the pages that only exist in English.
 */
export function alternatePath(pathname: string, target: Locale): string | null {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (target === "es") return ROUTE_MAP[clean] ?? null;
  return REVERSE_ROUTE_MAP[clean] ?? null;
}

/**
 * Builds a path in the given locale from an English path.
 *
 * Used by every shared component that renders a link, so a Spanish page's navigation stays inside
 * the Spanish site. Falls back to the English path when there is no translation, which is correct
 * for the order flow: it is one of the pages that is genuinely English-only.
 */
export function localePath(enPath: string, locale: Locale): string {
  if (locale === "en") return enPath;
  return ROUTE_MAP[enPath] ?? enPath;
}

/**
 * The order flow, the Design Studio, checkout and every transactional email are English only.
 *
 * Stated here rather than left implicit because it is a real product limitation the Spanish pages
 * have to be honest about: Stripe Checkout renders in its own locale, the proof and print-file
 * pipeline labels are English, and a customer service reply will come back in English. A Spanish
 * marketing page that leads someone into an English checkout without warning is worse than one that
 * says so on the button.
 */
export const ORDER_FLOW_LOCALE: Locale = "en";
