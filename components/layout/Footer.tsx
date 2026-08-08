import Link from "next/link";
import { Phone, Mail, Globe } from "lucide-react";
import { Wordmark } from "@/components/layout/Wordmark";
import { localePath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

const SERVICES = [
  { label: "Business Cards", href: "/services/business-cards" },
  { label: "Postcards", href: "/services/postcards" },
  { label: "Banners", href: "/services/banners" },
  { label: "Rigid Signs", href: "/services/rigid-signs" },
  { label: "Window Decals", href: "/services/window-decals" },
];

const COMPANY = [
  { label: "About", href: "/about" },
  { label: "Specials", href: "/specials" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

const LEGAL = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Refund Policy", href: "/refund-policy" },
];

const AREAS = [
  "Kansas City, MO",
  "Johnson County, KS",
  "Dallas-Fort Worth, TX",
  "Nationwide Online",
];

/**
 * The page ends in ink. On the homepage the closing CTA band is the same near-black surface, so
 * the two read as one continuous block rather than a theme flip at the bottom of the page.
 */
export function Footer({ locale = "en" }: { locale?: Locale } = {}) {
  const t = getDictionary(locale).footer;
  // Every internal link is resolved through localePath, so the Spanish footer keeps the reader on
  // the Spanish site instead of dropping them back into English at the bottom of every page.
  const path = (href: string) => localePath(href, locale);
  return (
    <footer className="bg-kc-ink text-white">
      <div className="container-tight px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <Wordmark variant="inverse" className="mb-5" />
            <p className="mb-6 max-w-xs text-sm leading-relaxed text-white/55">
              Business cards, postcards, banners, rigid signs, and window decals, designed by a real person and
              delivered print-ready. Ordered entirely online.
            </p>
            <div className="space-y-2.5">
              <a
                href="tel:+18165210462"
                className="flex items-center gap-2.5 font-mono text-[13.91px] text-white/70 transition-colors hover:text-white"
              >
                <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                (816) 521-0462
              </a>
              <a
                href="mailto:kansasdesigners@gmail.com"
                className="flex items-center gap-2.5 text-[13.91px] text-white/70 transition-colors hover:text-white"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                kansasdesigners@gmail.com
              </a>
              <a
                href="https://611printing.com"
                className="flex items-center gap-2.5 text-[13.91px] text-white/70 transition-colors hover:text-white"
              >
                <Globe className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                611printing.com
              </a>
            </div>
          </div>

          <FooterColumn title={t.servicesHeading}>
            {SERVICES.map((s) => (
              <li key={s.href}>
                <Link href={path(s.href)} className="text-[13.91px] text-white/60 transition-colors hover:text-white">
                  {s.label}
                </Link>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title={t.companyHeading}>
            {COMPANY.map((c) => (
              <li key={c.href}>
                <Link href={path(c.href)} className="text-[13.91px] text-white/60 transition-colors hover:text-white">
                  {c.label}
                </Link>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title={t.areasHeading}>
            {AREAS.map((city) => (
              <li key={city} className="text-[13.91px] text-white/60">
                {city}
              </li>
            ))}
          </FooterColumn>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-5 border-t border-kc-ink-line pt-7 sm:flex-row sm:items-center">
          <p className="text-xs text-white/50">
            {new Date().getFullYear()} 611 Printing. {t.rights}
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-xs text-white/50 transition-colors hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      {/* h2, not h3: these sit directly under the page <h1>, and skipping a level breaks
          heading-based navigation for screen reader users on any page without an <h2>. */}
      <h2 className="mb-4 text-[13.91px] font-semibold text-white">{title}</h2>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}
