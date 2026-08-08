import type { Metadata } from "next";
import { alternatePath, HTML_LANG, type Locale } from "./config";

/**
 * hreflang and canonical for a page that exists in both languages.
 *
 * Without these two URLs pointing at each other, a search engine sees an English page and a Spanish
 * page about the same product and has no reason to treat them as the same thing in two languages -
 * so it picks one, and the other competes with it. `x-default` names the version to serve someone
 * whose language matches neither, which for a Kansas City print shop is the English one.
 *
 * `canonical` is relative because the root layout sets metadataBase; Next resolves it per route.
 */
export function localeAlternates(enPath: string, locale: Locale): Metadata["alternates"] {
  const esPath = locale === "es" ? null : alternatePath(enPath, "es");
  const spanish = locale === "es" ? currentPath(enPath) : esPath;

  // A page with no counterpart gets a self-canonical and no language alternates, which is honest:
  // claiming a Spanish alternate that 404s is worse than claiming none.
  if (!spanish) return { canonical: "./" };

  return {
    canonical: "./",
    languages: {
      [HTML_LANG.en]: enPath,
      [HTML_LANG.es]: spanish,
      "x-default": enPath,
    },
  };
}

/** The Spanish URL for an English path, used when rendering from inside the Spanish tree. */
function currentPath(enPath: string): string | null {
  return alternatePath(enPath, "es");
}
