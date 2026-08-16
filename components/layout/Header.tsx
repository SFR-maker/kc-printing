"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { Menu, X, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/layout/Wordmark";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { CartButton } from "@/components/layout/CartButton";
import { localeFromPath, localePath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

/**
 * Navigation, in English paths.
 *
 * Paths are translated at render time through localePath rather than duplicated per locale, so a new
 * page is added here once and appears in both languages - or, if it has no Spanish translation yet,
 * falls back to its English URL rather than 404ing.
 */
const NAV_LINKS: { key: keyof ReturnType<typeof getDictionary>["nav"]; href: string }[] = [
  { key: "services", href: "/services" },
  { key: "specials", href: "/specials" },
  { key: "pricing", href: "/pricing" },
  { key: "portfolio", href: "/portfolio" },
  { key: "about", href: "/about" },
  { key: "contact", href: "/contact" },
];

// Baked in at build time - when empty, Clerk components are never rendered
const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/** Just the nav slice of the dictionary, which is all the auth blocks need. */
type Nav = ReturnType<typeof getDictionary>["nav"];

const CTA_CLASS =
  "edge bg-kc-coral px-4 text-white transition-colors hover:bg-kc-magenta-deep";

// Only rendered when CLERK_KEY is truthy (ClerkProvider is in the tree)
function ClerkAuthDesktop({ nav }: { nav: Nav }) {
  const { isSignedIn } = useUser();
  if (isSignedIn) {
    return (
      <>
        <Button asChild variant="ghost" size="sm" className="edge text-kc-dark hover:text-kc-magenta-deep">
          <Link href="/account">{nav.account}</Link>
        </Button>
        <UserButton />
      </>
    );
  }
  return (
    <>
      <Button asChild variant="ghost" size="sm" className="edge text-kc-dark hover:text-kc-magenta-deep">
        <Link href="/sign-in">{nav.signIn}</Link>
      </Button>
      <Button asChild size="sm" className={CTA_CLASS}>
        {/* The Design Studio is English-only, so this URL is not localised - see ORDER_FLOW_LOCALE. */}
        <Link href="/services/business-cards/design">{nav.startDesigning}</Link>
      </Button>
    </>
  );
}

function ClerkAuthMobile({ onClose, nav }: { onClose: () => void; nav: Nav }) {
  const { isSignedIn } = useUser();
  if (isSignedIn) {
    return (
      <Button asChild variant="outline" size="sm" className="edge w-full border-kc-dark/15 text-kc-dark">
        <Link href="/account" onClick={onClose}>{nav.account}</Link>
      </Button>
    );
  }
  return (
    <>
      <Button asChild variant="outline" size="sm" className="edge w-full border-kc-dark/15 text-kc-dark">
        <Link href="/sign-in" onClick={onClose}>{nav.signIn}</Link>
      </Button>
      <Button asChild size="sm" className={cn(CTA_CLASS, "w-full")}>
        <Link href="/services/business-cards/design" onClick={onClose}>{nav.startDesigning}</Link>
      </Button>
    </>
  );
}

/** Trimmed square mark with the wordmark set in the display face. */
export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // Derived from the URL rather than passed in, because Header is a client component shared by both
  // layouts and the path is the one thing that always says which site the reader is on.
  const locale: Locale = localeFromPath(pathname);
  const nav = getDictionary(locale).nav;
  const path = (href: string) => localePath(href, locale);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-kc-dark/10 bg-kc-bg/90 backdrop-blur-md">
      {/*
        min-h rather than a fixed h-16.

        A sticky bar only stops overlapping the page if the space it reserves in the flow is the
        space it actually paints. With `h-16` the row was locked to 64px while its contents were
        free to be taller - at 125% browser zoom the phone number wrapped to three lines and spilled
        out of the bottom of the bar, over the H1 of whatever page was underneath. `min-h-16` keeps
        the same 64px bar in every normal case and lets it grow rather than bleed in the ones that
        do not fit, so content below always clears it at any zoom or text size.
      */}
      <div className="container-tight flex min-h-16 items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href={path("/")}
          className="flex shrink-0 items-center gap-2.5"
          onClick={() => setOpen(false)}
        >
          <Wordmark />
        </Link>

        {/*
          The desktop bar turns on at `xl`, not `lg`.

          Wordmark, six nav links and the action cluster need about 1,050px side by side in English
          and about 1,140px in Spanish. At the `lg` boundary - which is also what a 1280px laptop
          window becomes at 125% browser zoom - there were only 960px of content box, so the row was
          crushed: the phone number wrapped to three lines ("(816)" / "521-" / "0462") on every page,
          and the Spanish header pushed the whole document 78px sideways. `xl` is the first width
          where the full bar fits in both languages; below it the same links live in the collapsed
          menu, which is where they already went below `lg`. This is the same fix that moved the
          breakpoint from `md` to `lg` - see tests/e2e/11-layout-regression.spec.ts.
        */}
        <nav className="hidden items-center gap-7 xl:flex">
          {NAV_LINKS.map((link) => {
            const href = path(link.href);
            // Compared against the localised href so the Spanish nav highlights the Spanish page.
            const active = pathname.startsWith(href);
            return (
              <Link
                key={link.href}
                href={href}
                className={cn(
                  "relative py-1 text-[14.45px] font-medium tracking-tight transition-colors hover:text-kc-magenta-deep",
                  active ? "text-kc-dark" : "text-kc-dark/70"
                )}
              >
                {nav[link.key]}
                {active && (
                  <span className="absolute -bottom-0.5 left-0 h-px w-full bg-kc-coral" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 xl:flex">
          {/* whitespace-nowrap: a phone number is one token. Wrapped, it reads as three numbers and
              makes the bar taller than the space it reserves. */}
          <a
            href="tel:+18165210462"
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap font-mono text-[13.38px] text-kc-dark/70 transition-colors hover:text-kc-magenta-deep"
          >
            <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            (816) 521-0462
          </a>
          <LanguageSwitcher className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[13.38px] font-medium text-kc-dark/70 transition-colors hover:text-kc-magenta-deep" />
          {/* Renders nothing unless there is an unfinished order to return to. */}
          <CartButton className="shrink-0" />
          {CLERK_KEY ? (
            <ClerkAuthDesktop nav={nav} />
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="edge text-kc-dark hover:text-kc-magenta-deep">
                <Link href="/sign-in">{nav.signIn}</Link>
              </Button>
              <Button asChild size="sm" className={CTA_CLASS}>
                <Link href="/services/business-cards/design">{nav.startDesigning}</Link>
              </Button>
            </>
          )}
        </div>

        <button
          aria-label="Toggle navigation"
          aria-expanded={open}
          data-testid="mobile-nav"
          className="edge p-2 text-kc-dark xl:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
        </button>
      </div>

      {open && (
        <div
          data-testid="mobile-menu"
          className="border-t border-kc-dark/10 bg-kc-bg px-4 pb-4 pt-2 xl:hidden"
        >
          <nav className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={path(link.href)}
                className={cn(
                  "border-b border-kc-dark/8 py-3 text-sm font-medium transition-colors",
                  pathname.startsWith(path(link.href)) ? "text-kc-coral" : "text-kc-dark"
                )}
                onClick={() => setOpen(false)}
              >
                {nav[link.key]}
              </Link>
            ))}
            <LanguageSwitcher className="flex items-center gap-2 border-b border-kc-dark/8 py-3 text-sm font-medium text-kc-dark transition-colors hover:text-kc-magenta-deep" />
            <div className="flex items-center border-b border-kc-dark/8 py-3">
              <CartButton className="text-sm font-medium text-kc-dark" />
            </div>
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <a
              href="tel:+18165210462"
              className="flex items-center gap-2 whitespace-nowrap py-1 font-mono text-[13.91px] text-kc-dark/70"
            >
              <Phone className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              (816) 521-0462
            </a>
            {CLERK_KEY ? (
              <ClerkAuthMobile onClose={() => setOpen(false)} nav={nav} />
            ) : (
              <>
                <Button asChild variant="outline" size="sm" className="edge w-full border-kc-dark/15 text-kc-dark">
                  <Link href="/sign-in" onClick={() => setOpen(false)}>{nav.signIn}</Link>
                </Button>
                <Button asChild size="sm" className={cn(CTA_CLASS, "w-full")}>
                  <Link href="/services/business-cards/design" onClick={() => setOpen(false)}>
                    {nav.startDesigning}
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
