import Link from "next/link";
import { Phone, Mail, Globe } from "lucide-react";

const SERVICES = [
  { label: "Business Cards", href: "/services/business-cards" },
  { label: "Postcards", href: "/services/postcards" },
  { label: "Banners", href: "/services/banners" },
];

const COMPANY = [
  { label: "About", href: "/about" },
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

export function Footer() {
  return (
    <footer className="border-t border-kc-border bg-kc-bg">
      <div className="container-tight px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-5 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-kc-teal">
                <span className="text-base font-black text-white leading-none">KC</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold tracking-widest text-kc-dark uppercase">Printing</span>
                <span className="text-[9px] font-medium tracking-wider text-kc-muted uppercase">Design Studio</span>
              </div>
            </div>
            <p className="mb-5 text-sm leading-relaxed text-kc-muted">
              Business cards, postcards, and banners, designed by a real person and delivered print-ready. Ordered entirely online.
            </p>
            <div className="space-y-2.5">
              <a href="tel:+18165210462" className="flex items-center gap-2 text-sm text-kc-muted hover:text-kc-teal transition-colors">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                (816) 521-0462
              </a>
              <a href="mailto:kansasdesigners@gmail.com" className="flex items-center gap-2 text-sm text-kc-muted hover:text-kc-teal transition-colors">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                kansasdesigners@gmail.com
              </a>
              <a href="https://kcprinting.com" className="flex items-center gap-2 text-sm text-kc-muted hover:text-kc-teal transition-colors">
                <Globe className="h-3.5 w-3.5 shrink-0" />
                kcprinting.com
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-kc-muted/60">Services</h3>
            <ul className="space-y-2.5">
              {SERVICES.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="text-sm text-kc-muted hover:text-kc-teal transition-colors">
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-kc-muted/60">Company</h3>
            <ul className="space-y-2.5">
              {COMPANY.map((c) => (
                <li key={c.href}>
                  <Link href={c.href} className="text-sm text-kc-muted hover:text-kc-teal transition-colors">
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Service Areas */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-kc-muted/60">Service Areas</h3>
            <ul className="space-y-2 text-sm text-kc-muted">
              {["Kansas City, MO", "Overland Park, KS", "Dallas, TX", "Plano, TX", "Addison, TX", "Nationwide Online"].map((city) => (
                <li key={city}>{city}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-kc-border pt-6 sm:flex-row">
          <p className="text-xs text-kc-muted">
            {new Date().getFullYear()} KC Printing. All rights reserved. Fully online design studio.
          </p>
          <nav className="flex gap-5">
            {LEGAL.map((l) => (
              <Link key={l.href} href={l.href} className="text-xs text-kc-muted hover:text-kc-dark transition-colors">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
