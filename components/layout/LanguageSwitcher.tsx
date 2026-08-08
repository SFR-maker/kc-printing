"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { alternatePath, LOCALE_LABEL, localeFromPath, type Locale } from "@/lib/i18n/config";

/**
 * Switches between the English and Spanish version of the page currently open.
 *
 * It links to the *equivalent* page rather than to the other language's home page. Dropping someone
 * on the Spanish homepage when they were reading about window decals means they have to find their
 * way back through the navigation, which most people do not bother to do - they leave.
 *
 * On a page with no translation - the order flow, the Design Studio, the account area - the switcher
 * renders nothing at all. Offering a language toggle that leads to a 404, or that silently sends the
 * reader somewhere unrelated, is worse than not offering one.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const pathname = usePathname() ?? "/";
  const current: Locale = localeFromPath(pathname);
  const target: Locale = current === "en" ? "es" : "en";
  const href = alternatePath(pathname, target);

  if (!href) return null;

  return (
    <Link
      href={href}
      // The link leads to Spanish, so it is labelled in Spanish. `hrefLang` tells assistive tech and
      // crawlers what is on the other end, which a bare "ES" does not.
      hrefLang={target}
      lang={target}
      aria-label={`${LOCALE_LABEL[target]} — ${target === "es" ? "ver esta página en español" : "view this page in English"}`}
      className={className}
    >
      <Globe className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
      {LOCALE_LABEL[target]}
    </Link>
  );
}
