import Link from "next/link";
import { Phone, Mail, Globe, Share2, Users, MessageCircle } from "lucide-react";

const SERVICES = [
  { label: "Business Cards", href: "/services/business-cards" },
  { label: "Postcards", href: "/services/postcards" },
  { label: "Logo Design", href: "/services/logo-design" },
  { label: "Website Design", href: "/services/web-design" },
  { label: "Roll-Up Banners", href: "/services/roll-up-banners" },
  { label: "Vinyl Banners", href: "/services/vinyl-banners" },
  { label: "Print Design", href: "/services/print-design" },
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
    <footer className="bg-kc-dark text-white">
      <div className="container-tight px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-kc-teal">
                <span className="text-lg font-black text-kc-coral leading-none">KC</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold tracking-widest text-white uppercase">Printing</span>
                <span className="text-[9px] font-medium tracking-wider text-white/50 uppercase">Design Studio</span>
              </div>
            </div>
            <p className="text-sm text-white/60 leading-relaxed mb-4">
              Premium online print and design services. Fast turnaround, print-ready files, AI-assisted creative direction.
            </p>
            <div className="space-y-2">
              <a href="tel:+18165210462" className="flex items-center gap-2 text-sm text-white/60 hover:text-kc-coral transition-colors">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                (816) 521-0462
              </a>
              <a href="mailto:kansasdesigners@gmail.com" className="flex items-center gap-2 text-sm text-white/60 hover:text-kc-coral transition-colors">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                kansasdesigners@gmail.com
              </a>
              <a href="https://kcprinting.com" className="flex items-center gap-2 text-sm text-white/60 hover:text-kc-coral transition-colors">
                <Globe className="h-3.5 w-3.5 shrink-0" />
                kcprinting.com
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">Services</h3>
            <ul className="space-y-2">
              {SERVICES.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="text-sm text-white/60 hover:text-kc-coral transition-colors">
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">Company</h3>
            <ul className="space-y-2">
              {COMPANY.map((c) => (
                <li key={c.href}>
                  <Link href={c.href} className="text-sm text-white/60 hover:text-kc-coral transition-colors">
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">Service Areas</h3>
            <ul className="space-y-1.5 text-sm text-white/60 mb-6">
              <li>Kansas City, MO</li>
              <li>Overland Park, KS</li>
              <li>Dallas, TX</li>
              <li>Plano, TX</li>
              <li>Addison, TX</li>
              <li>Nationwide Online</li>
            </ul>
            <div className="flex gap-3">
              <a href="#" aria-label="Instagram" className="text-white/40 hover:text-kc-coral transition-colors">
                <Share2 className="h-4 w-4" />
              </a>
              <a href="#" aria-label="Facebook" className="text-white/40 hover:text-kc-coral transition-colors">
                <Users className="h-4 w-4" />
              </a>
              <a href="#" aria-label="Twitter" className="text-white/40 hover:text-kc-coral transition-colors">
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">
            {new Date().getFullYear()} KC Printing. All rights reserved. Fully online design studio.
          </p>
          <nav className="flex gap-4">
            {LEGAL.map((l) => (
              <Link key={l.href} href={l.href} className="text-xs text-white/40 hover:text-white/70 transition-colors">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
