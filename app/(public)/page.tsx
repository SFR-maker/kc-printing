import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Star, Zap, Shield, Clock, CheckCircle2, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "KC Printing - Premium Print and Design Services Online | Kansas City",
  description:
    "Custom business cards, postcards, banners, logo design, and website design. Fast online ordering, print-ready files. Serving Kansas City, Dallas, Plano, and nationwide.",
};

const SERVICES = [
  { name: "Business Cards", href: "/services/business-cards", icon: "🪪", price: "from $39", desc: "Standard, square, slim, circle, and leaf shapes. 14-32pt paper options." },
  { name: "Postcards", href: "/services/postcards", icon: "📬", price: "from $49", desc: "Multiple sizes, front and back, EDDM-ready for marketing campaigns." },
  { name: "Logo Design", href: "/services/logo-design", icon: "✦", price: "from $100", desc: "Professional logos with full ownership. All formats: EPS, PDF, SVG, PNG." },
  { name: "Website Design", href: "/services/web-design", icon: "🌐", price: "from $299", desc: "SEO-optimized, mobile-ready websites. One page to full e-commerce." },
  { name: "Roll-Up Banners", href: "/services/roll-up-banners", icon: "🎯", price: "from $79", desc: "Retractable banner stand designs with print-ready bleed and safe zones." },
  { name: "Vinyl Banners", href: "/services/vinyl-banners", icon: "🏷", price: "from $79", desc: "Large format banners from 2x4 to 4x10. Mesh, gloss, and matte vinyl." },
  { name: "Print Design", href: "/services/print-design", icon: "🖨", price: "from $59", desc: "Flyers, brochures, letterheads, and general brand design services." },
];

const TESTIMONIALS = [
  { name: "Maria Torres", company: "Torres Bakery", text: "KC Printing delivered a stunning business card design in less than 24 hours. The colors were perfect and the file was print-ready.", rating: 5 },
  { name: "James Whitfield", company: "Whitfield Law Group", text: "We needed a complete rebrand with logo and postcards. The team nailed it on the first concept. Professional, fast, and priced fairly.", rating: 5 },
  { name: "Sandra Bell", company: "Bell Dental Group", text: "Our new website design increased patient inquiries from the first week. Clean, professional, and exactly what a dental office needs.", rating: 5 },
];

const FAQS = [
  { q: "How does the ordering process work?", a: "Choose your service and package, upload your brand files or notes, and our designers get to work. You receive your first draft within 1-3 business days. Request revisions and download your final print-ready files when approved." },
  { q: "What file formats do you deliver?", a: "Design files are delivered print-ready. Business cards and postcards come as PDF with proper bleed. Logos are delivered as EPS, PDF, high-resolution JPG, transparent PNG, and SVG. Website designs come as Figma files or HTML handoff." },
  { q: "Do I need to provide any files?", a: "Not required but helpful. You can upload logos, brand colors, existing materials, or inspiration. If you have nothing, our AI-assisted brief tool will help capture your vision before the designer starts." },
  { q: "Can I request revisions?", a: "Yes. Every package includes a set number of included revisions ranging from 4 to 8 depending on the tier. Additional revisions are available at a flat rate if you need more." },
  { q: "Do you serve businesses outside Kansas City?", a: "Absolutely. KC Printing is a fully online design studio serving businesses in Kansas City, Dallas, Plano, Addison, Overland Park, and clients nationwide. All ordering and file delivery is done digitally." },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-kc-bg">
        {/* Ambient gradient orbs */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-40 -top-40 h-[700px] w-[700px] rounded-full bg-violet-500/[0.07] blur-3xl" />
          <div className="absolute -right-40 top-10 h-[600px] w-[600px] rounded-full bg-orange-400/[0.06] blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-violet-400/[0.04] blur-3xl" />
        </div>

        <div className="container-tight relative z-10 px-4 pb-12 pt-20 sm:px-6 lg:px-8 lg:pt-28">
          {/* Trust pill */}
          <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-kc-border bg-kc-surface px-4 py-1.5 text-sm font-medium text-kc-muted shadow-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-kc-sage" />
            Kansas City&apos;s Favorite Online Design Studio
          </div>

          {/* Headline */}
          <h1 className="mb-8 max-w-4xl text-5xl font-black leading-[1.02] tracking-tight text-kc-dark sm:text-7xl lg:text-[88px]">
            Print and Design<br />
            <span className="text-gradient-brand">Built to Win.</span>
          </h1>

          {/* Sub */}
          <p className="mb-10 max-w-2xl text-xl leading-relaxed text-kc-muted">
            Business cards, postcards, banners, logos, and websites. Fast turnaround, AI-assisted creative direction, and print-ready files delivered online.
          </p>

          {/* CTAs */}
          <div className="mb-12 flex flex-wrap gap-4">
            <Button
              asChild
              size="lg"
              className="h-14 rounded-xl bg-kc-coral px-10 text-base font-semibold text-white shadow-orange-glow hover:bg-kc-coral/90"
            >
              <Link href="/services">
                Start Your Order <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 rounded-xl border-kc-border px-8 text-base text-kc-dark hover:bg-kc-surface"
            >
              <Link href="/portfolio">See Our Work</Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-kc-muted">
            {["No contracts or minimums", "Print-ready files included", "24hr rush available"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-kc-sage" />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div className="container-tight px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 border-t border-kc-border pt-10 sm:grid-cols-4">
            {[
              { value: "50+", label: "Clients Served" },
              { value: "4.9★", label: "Average Rating" },
              { value: "98%", label: "Quality Score" },
              { value: "24hr", label: "Rush Available" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-black text-kc-teal">{stat.value}</div>
                <div className="mt-1 text-sm text-kc-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services Grid ── */}
      <section className="section-pad bg-kc-surface">
        <div className="container-tight">
          <div className="mb-14 text-center">
            <Badge className="mb-4 border-kc-teal/20 bg-kc-teal/8 text-kc-teal">Everything Your Brand Needs</Badge>
            <h2 className="text-3xl font-black tracking-tight text-kc-dark sm:text-4xl lg:text-5xl">
              One Studio.<br className="sm:hidden" /> Every Format.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-kc-muted">
              Print and digital design, all in one place. Original files, real designers, real results.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {SERVICES.map((service) => (
              <Link key={service.href} href={service.href} className="group">
                <Card className="h-full border-kc-border hover-card-lift">
                  <CardContent className="flex h-full flex-col p-6">
                    <div className="mb-4 text-3xl">{service.icon}</div>
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="font-bold text-kc-dark group-hover:text-kc-teal transition-colors">{service.name}</h3>
                      <Badge variant="secondary" className="shrink-0 border-0 bg-kc-violet-tint text-kc-teal text-xs">
                        {service.price}
                      </Badge>
                    </div>
                    <p className="flex-1 text-sm leading-relaxed text-kc-muted">{service.desc}</p>
                    <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-kc-teal">
                      Get started <ArrowRight className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="section-pad bg-kc-bg">
        <div className="container-tight">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-black tracking-tight text-kc-dark sm:text-4xl lg:text-5xl">How It Works</h2>
            <p className="mx-auto mt-4 max-w-xl text-kc-muted">From idea to print-ready file in three simple steps.</p>
          </div>
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
            {[
              { step: "01", title: "Choose Your Service and Package", desc: "Select the service you need, pick a package tier, and add any extras. Our live price calculator shows your total instantly." },
              { step: "02", title: "Share Your Brand Info", desc: "Upload existing files, fill out a short brand questionnaire, or use our AI brief tool. Designers review everything before starting." },
              { step: "03", title: "Review, Revise, and Download", desc: "Get your first draft within 1-3 business days. Request revisions, approve the final design, and download your print-ready files." },
            ].map((item) => (
              <div key={item.step} className="relative flex flex-col">
                <div className="mb-4 text-7xl font-black text-kc-teal/10 leading-none select-none">{item.step}</div>
                <div className="-mt-8 mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-kc-teal text-white text-sm font-black shadow-violet-glow">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-bold text-kc-dark">{item.title}</h3>
                <p className="text-sm leading-relaxed text-kc-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Feature — gradient card ── */}
      <section className="section-pad bg-kc-surface">
        <div className="container-tight">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-violet-card px-8 py-12 text-white sm:px-12 lg:px-16 lg:py-16">
            {/* Orbs inside card */}
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/[0.04] blur-2xl" />
            <div className="pointer-events-none absolute -bottom-24 left-20 h-72 w-72 rounded-full bg-orange-500/[0.10] blur-2xl" />

            <div className="relative z-10 flex flex-col items-start gap-10 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <Badge className="mb-5 border-white/20 bg-white/10 text-white hover:bg-white/10">
                  AI-Assisted Creative Direction
                </Badge>
                <h2 className="mb-4 text-3xl font-black sm:text-4xl">AI Helps. Humans Perfect It.</h2>
                <p className="text-lg leading-relaxed text-white/80">
                  Every order includes optional AI tools to generate copy, suggest brand colors, create logo concepts, and write SEO-optimized content. A human designer reviews every output before anything reaches you.
                </p>
              </div>
              <div className="grid w-full max-w-xs grid-cols-2 gap-3 shrink-0">
                {[
                  { icon: <Zap className="h-4 w-4" />, label: "AI Copy Generator" },
                  { icon: <Shield className="h-4 w-4" />, label: "Human Review" },
                  { icon: <Clock className="h-4 w-4" />, label: "Fast Turnaround" },
                  { icon: <CheckCircle2 className="h-4 w-4" />, label: "Print-Ready Files" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-sm">
                    <span className="text-kc-yellow">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="section-pad bg-kc-bg">
        <div className="container-tight">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-black tracking-tight text-kc-dark sm:text-4xl">What Clients Say</h2>
            <p className="mx-auto mt-4 max-w-xl text-kc-muted">Real results for real businesses across Kansas City and beyond.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="border-kc-border hover-card-lift">
                <CardContent className="p-7">
                  <div className="mb-4 flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-kc-yellow text-kc-yellow" />
                    ))}
                  </div>
                  <p className="mb-5 text-sm leading-relaxed text-kc-dark">&ldquo;{t.text}&rdquo;</p>
                  <div>
                    <div className="text-sm font-semibold text-kc-dark">{t.name}</div>
                    <div className="text-xs text-kc-muted">{t.company}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section-pad bg-kc-surface">
        <div className="container-tight max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-black tracking-tight text-kc-dark sm:text-4xl">Frequently Asked Questions</h2>
          </div>
          <Accordion className="space-y-3">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-kc-border px-5">
                <AccordionTrigger className="text-left font-semibold text-kc-dark hover:text-kc-teal hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="pb-4 leading-relaxed text-kc-muted">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-8 text-center">
            <Button asChild variant="outline" className="border-kc-border text-kc-dark hover:bg-kc-bg hover:border-kc-teal/30">
              <Link href="/faq">View All FAQs</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="section-pad bg-kc-bg">
        <div className="container-tight">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-6 text-4xl font-black tracking-tight text-kc-dark sm:text-5xl">
              Ready to Get <span className="text-gradient-brand">Started?</span>
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-kc-muted">
              No contracts, no minimums. Just great design, delivered fast. Call, text, or start an order online.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="h-14 w-full rounded-xl bg-kc-coral px-10 text-base font-semibold text-white shadow-orange-glow hover:bg-kc-coral/90 sm:w-auto">
                <Link href="/services">Browse All Services <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 w-full rounded-xl border-kc-border px-8 text-base text-kc-dark hover:bg-kc-surface sm:w-auto">
                <Link href="/contact">Get a Free Quote</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 text-sm text-kc-muted sm:flex-row sm:gap-8">
              <a href="tel:+18165210462" className="flex items-center gap-2 hover:text-kc-teal transition-colors">
                <Phone className="h-4 w-4" /> (816) 521-0462
              </a>
              <a href="mailto:kansasdesigners@gmail.com" className="flex items-center gap-2 hover:text-kc-teal transition-colors">
                <Mail className="h-4 w-4" /> kansasdesigners@gmail.com
              </a>
            </div>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                name: "KC Printing",
                url: "https://kcprinting.com",
                telephone: "+18165210462",
                email: "kansasdesigners@gmail.com",
                description: "Fully online print and design services studio.",
                areaServed: ["Kansas City, MO", "Dallas, TX", "Plano, TX", "Addison, TX", "Overland Park, KS", "United States"],
              },
            ],
          }),
        }}
      />
    </>
  );
}
