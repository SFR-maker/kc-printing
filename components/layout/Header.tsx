"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { Menu, X, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { label: "Services", href: "/services" },
  { label: "Pricing", href: "/pricing" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { isSignedIn } = useUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-kc-border bg-white/95 backdrop-blur-sm">
      <div className="container-tight flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 shrink-0" onClick={() => setOpen(false)}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-kc-teal">
            <span className="text-lg font-black text-kc-coral leading-none">KC</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-widest text-kc-teal uppercase">Printing</span>
            <span className="text-[9px] font-medium tracking-wider text-kc-muted uppercase">Design Studio</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-kc-teal",
                pathname.startsWith(link.href) ? "text-kc-teal" : "text-kc-dark/80"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <a href="tel:+18165210462" className="flex items-center gap-1.5 text-sm text-kc-muted hover:text-kc-teal transition-colors">
            <Phone className="h-3.5 w-3.5" />
            (816) 521-0462
          </a>
          {!isSignedIn ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button asChild size="sm" className="bg-kc-coral hover:bg-kc-coral/90 text-white">
                <Link href="/services">Start Order</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/account">My Orders</Link>
              </Button>
              <UserButton />
            </>
          )}
        </div>

        <button
          aria-label="Toggle navigation"
          data-testid="mobile-nav"
          className="md:hidden p-2 rounded-md text-kc-dark"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-kc-border bg-white px-4 pb-4 pt-2">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname.startsWith(link.href) ? "bg-kc-teal/10 text-kc-teal" : "text-kc-dark hover:bg-kc-bg"
                )}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-kc-border pt-3">
            <a href="tel:+18165210462" className="flex items-center gap-2 px-3 py-2 text-sm text-kc-muted">
              <Phone className="h-4 w-4" />
              (816) 521-0462
            </a>
            {!isSignedIn ? (
              <>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/sign-in" onClick={() => setOpen(false)}>Sign In</Link>
                </Button>
                <Button asChild size="sm" className="w-full bg-kc-coral hover:bg-kc-coral/90 text-white">
                  <Link href="/services" onClick={() => setOpen(false)}>Start Order</Link>
                </Button>
              </>
            ) : (
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/account" onClick={() => setOpen(false)}>My Orders</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
