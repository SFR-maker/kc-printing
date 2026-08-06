"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { Menu, X, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/layout/Wordmark";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { label: "Services", href: "/services" },
  { label: "Pricing", href: "/pricing" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

// Baked in at build time - when empty, Clerk components are never rendered
const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const CTA_CLASS =
  "edge bg-kc-coral px-4 text-white transition-colors hover:bg-kc-magenta-deep";

// Only rendered when CLERK_KEY is truthy (ClerkProvider is in the tree)
function ClerkAuthDesktop() {
  const { isSignedIn } = useUser();
  if (isSignedIn) {
    return (
      <>
        <Button asChild variant="ghost" size="sm" className="edge text-kc-dark hover:text-kc-magenta-deep">
          <Link href="/account">My Orders</Link>
        </Button>
        <UserButton />
      </>
    );
  }
  return (
    <>
      <Button asChild variant="ghost" size="sm" className="edge text-kc-dark hover:text-kc-magenta-deep">
        <Link href="/sign-in">Sign In</Link>
      </Button>
      <Button asChild size="sm" className={CTA_CLASS}>
        <Link href="/services/business-cards/design">Start designing</Link>
      </Button>
    </>
  );
}

function ClerkAuthMobile({ onClose }: { onClose: () => void }) {
  const { isSignedIn } = useUser();
  if (isSignedIn) {
    return (
      <Button asChild variant="outline" size="sm" className="edge w-full border-kc-dark/15 text-kc-dark">
        <Link href="/account" onClick={onClose}>My Orders</Link>
      </Button>
    );
  }
  return (
    <>
      <Button asChild variant="outline" size="sm" className="edge w-full border-kc-dark/15 text-kc-dark">
        <Link href="/sign-in" onClick={onClose}>Sign In</Link>
      </Button>
      <Button asChild size="sm" className={cn(CTA_CLASS, "w-full")}>
        <Link href="/services/business-cards/design" onClick={onClose}>Start designing</Link>
      </Button>
    </>
  );
}

/** Trimmed square mark with the wordmark set in the display face. */
export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-kc-dark/10 bg-kc-bg/90 backdrop-blur-md">
      <div className="container-tight flex h-16 items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          onClick={() => setOpen(false)}
        >
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative py-1 text-[14.45px] font-medium tracking-tight transition-colors hover:text-kc-magenta-deep",
                  active ? "text-kc-dark" : "text-kc-dark/70"
                )}
              >
                {link.label}
                {active && (
                  <span className="absolute -bottom-0.5 left-0 h-px w-full bg-kc-coral" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="tel:+18165210462"
            className="flex items-center gap-1.5 font-mono text-[13.38px] text-kc-dark/70 transition-colors hover:text-kc-magenta-deep"
          >
            <Phone className="h-3.5 w-3.5" strokeWidth={1.75} />
            (816) 521-0462
          </a>
          {CLERK_KEY ? (
            <ClerkAuthDesktop />
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="edge text-kc-dark hover:text-kc-magenta-deep">
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button asChild size="sm" className={CTA_CLASS}>
                <Link href="/services/business-cards/design">Start designing</Link>
              </Button>
            </>
          )}
        </div>

        <button
          aria-label="Toggle navigation"
          aria-expanded={open}
          data-testid="mobile-nav"
          className="edge p-2 text-kc-dark lg:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
        </button>
      </div>

      {open && (
        <div
          data-testid="mobile-menu"
          className="border-t border-kc-dark/10 bg-kc-bg px-4 pb-4 pt-2 lg:hidden"
        >
          <nav className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "border-b border-kc-dark/8 py-3 text-sm font-medium transition-colors",
                  pathname.startsWith(link.href) ? "text-kc-coral" : "text-kc-dark"
                )}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <a
              href="tel:+18165210462"
              className="flex items-center gap-2 py-1 font-mono text-[13.91px] text-kc-dark/70"
            >
              <Phone className="h-4 w-4" strokeWidth={1.75} />
              (816) 521-0462
            </a>
            {CLERK_KEY ? (
              <ClerkAuthMobile onClose={() => setOpen(false)} />
            ) : (
              <>
                <Button asChild variant="outline" size="sm" className="edge w-full border-kc-dark/15 text-kc-dark">
                  <Link href="/sign-in" onClick={() => setOpen(false)}>Sign In</Link>
                </Button>
                <Button asChild size="sm" className={cn(CTA_CLASS, "w-full")}>
                  <Link href="/services/business-cards/design" onClick={() => setOpen(false)}>
                    Start designing
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
