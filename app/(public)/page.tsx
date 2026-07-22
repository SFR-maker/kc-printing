import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Star, Phone, Mail, FileCheck, Users2, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PrintStack } from "@/components/sections/PrintStack";
import { db } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "KC Printing - Business Cards, Postcards & Banners | Kansas City",
  description:
    "Custom business cards, postcards, and banners. Fast online ordering, print-ready files. Serving Kansas City, Dallas, Plano, and nationwide.",
};

// Homepage pulls live testimonials from the DB (see below) — revalidate periodically so a newly
// approved testimonial shows up without requiring a full redeploy.
export const revalidate = 3600;

const SERVICES = [
  {
    name: "Business Cards",
    href: "/services/business-cards",
    price: "from $39",
    sizes: "Standard, square, slim, circle, or leaf shapes",
    bestFor: "Networking, trade shows, front-desk stacks",
    accent: "bg-kc-teal",
  },
  {
    name: "Postcards",
    href: "/services/postcards",
    price: "from $49",
    sizes: "3×5 up to 6×11, EDDM-ready",
    bestFor: "Mailers, promotions, seasonal campaigns",
    accent: "bg-kc-coral",
  },
  {
    name: "Banners",
    href: "/services/banners",
    price: "from $79",
    sizes: "Roll-up stands or vinyl, 24″ up to 10 ft",
    bestFor: "Storefronts, trade shows, events",
    accent: "bg-kc-yellow",
  },
];

const FAQS = [
  { q: "How does the ordering process work?", a: "Choose your product and package, upload your artwork or notes, and our designers get to work. You'll see your first draft within 1-3 business days. Request revisions and download your print-ready files once you approve." },
  { q: "What file formats do you deliver?", a: "Business cards, postcards, and banners all come as a print-ready PDF with proper bleed, plus a high-resolution JPG and PNG — ready to send to any print shop, including ours." },
  { q: "I don't have a finished design. Can you still help?", a: "Yes. Upload a logo, some brand colors, or just tell us what you're going for, and our AI-assisted brief tool helps capture the direction before a real designer starts the layout." },
  { q: "Can I request revisions?", a: "Yes. Every package includes 4 to 8 revisions depending on the tier. Need more than that? Additional revisions are available at a flat rate." },
  { q: "Do you serve businesses outside Kansas City?", a: "We do. KC Printing is based in Kansas City but works with businesses in Dallas, Plano, Overland Park, and nationwide — all ordering and file delivery happens online." },
];

export default async function HomePage() {
  // Real customer testimonials only, moderated via /admin/testimonials. No fallback fake
  // quotes — the section below renders nothing until real reviews exist and are approved.
  const testimonials = await db.testimonial.findMany({
    where: { approved: true, featured: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  return (
    <>
      {/* ── Hero ── */}
      <section className="bg-kc-bg">
        <div className="container-tight grid grid-cols-1 items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:pb-24 lg:pt-20">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-kc-border bg-kc-surface px-3.5 py-1 text-xs font-semibold uppercase tracking-wide text-kc-muted">
              Kansas City, MO · Serving clients nationwide online
            </div>

            <h1 className="mb-6 max-w-lg text-4xl font-black leading-[1.08] tracking-tight text-kc-dark sm:text-5xl lg:text-[3.4rem]">
              Business cards, postcards, and banners — designed and printed right.
            </h1>

            <p className="mb-8 max-w-md text-lg leading-relaxed text-kc-muted">
              Pick a product, tell us what you&apos;re going for, and a real designer builds your print-ready file. No design software required.
            </p>

            <div className="mb-10 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-13 rounded-md bg-kc-coral px-8 text-base font-semibold text-white hover:bg-kc-coral/90">
                <Link href="/services">
                  Browse Products <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-13 rounded-md border-kc-border px-7 text-base text-kc-dark hover:bg-kc-surface">
                <Link href="/services/business-cards/design">Start Designing</Link>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-kc-muted">
              <span className="flex items-center gap-1.5"><FileCheck className="h-4 w-4 text-kc-teal" /> Print-ready files included</span>
              <span className="flex items-center gap-1.5"><Users2 className="h-4 w-4 text-kc-teal" /> Real designers, not templates</span>
              <span className="flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-kc-teal" /> No contracts or minimums</span>
            </div>
          </div>

          <PrintStack />
        </div>
      </section>

      {/* ── Products ── */}
      <section className="section-pad bg-kc-surface">
        <div className="container-tight">
          <div className="mb-10 max-w-xl">
            <h2 className="text-3xl font-black tracking-tight text-kc-dark sm:text-4xl">Three products. Done well.</h2>
            <p className="mt-3 text-kc-muted">We keep the catalog focused so every order gets real attention from a designer who knows the format.</p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {SERVICES.map((service) => (
              <Link key={service.href} href={service.href} className="group block overflow-hidden rounded-md border border-kc-border bg-white transition-colors hover:border-kc-teal/40">
                <div className={`h-1.5 w-full ${service.accent}`} />
                <div className="p-6">
                  <div className="mb-3 flex items-baseline justify-between gap-2">
                    <h3 className="text-lg font-bold text-kc-dark">{service.name}</h3>
                    <span className="shrink-0 text-sm font-semibold text-kc-teal">{service.price}</span>
                  </div>
                  <dl className="space-y-1.5 text-sm text-kc-muted">
                    <div className="flex gap-1.5">
                      <dt className="shrink-0 font-medium text-kc-dark/70">Sizes:</dt>
                      <dd>{service.sizes}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="shrink-0 font-medium text-kc-dark/70">Best for:</dt>
                      <dd>{service.bestFor}</dd>
                    </div>
                  </dl>
                  <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-kc-teal">
                    View {service.name} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="section-pad bg-kc-bg">
        <div className="container-tight">
          <div className="mb-12 max-w-xl">
            <h2 className="text-3xl font-black tracking-tight text-kc-dark sm:text-4xl">How it works</h2>
            <p className="mt-3 text-kc-muted">From idea to print-ready file in three steps.</p>
          </div>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            {[
              { step: "01", title: "Choose your product and package", desc: "Pick the product and tier you need, and add any extras. The price updates as you go, so there's no guessing." },
              { step: "02", title: "Upload your artwork or ask for help", desc: "Have a finished file? Upload it. Starting from scratch? Our AI brief tool and design team help you get there." },
              { step: "03", title: "Review, revise, and download", desc: "Your first draft arrives in 1-3 business days. Request changes, approve the final version, and download your print-ready files." },
            ].map((item) => (
              <div key={item.step} className="border-t-2 border-kc-dark/10 pt-5">
                <div className="mb-2 text-sm font-black tracking-widest text-kc-coral">{item.step}</div>
                <h3 className="mb-2 text-lg font-bold text-kc-dark">{item.title}</h3>
                <p className="text-sm leading-relaxed text-kc-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Design help ── */}
      <section className="section-pad-tight bg-kc-violet-tint">
        <div className="container-tight grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="mb-3 text-2xl font-black tracking-tight text-kc-dark sm:text-3xl">
              Have the idea but not the finished file?
            </h2>
            <p className="max-w-xl text-kc-muted">
              You don&apos;t need to be a designer to order from us. Tell us what you&apos;re picturing, upload a logo or a few reference images, and a real person will build the layout — the AI brief tool just helps you get your thoughts down first.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <Button asChild size="lg" className="rounded-md bg-kc-teal text-white hover:bg-kc-teal/90">
              <Link href="/services/business-cards/design">Start Designing</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-md border-kc-teal/30 bg-white text-kc-dark hover:bg-white/80">
              <Link href="/contact">Get Design Help</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Testimonials (real, admin-moderated — hidden until at least one exists) ── */}
      {testimonials.length > 0 && (
        <section className="section-pad bg-kc-surface">
          <div className="container-tight">
            <div className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
              <div>
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: testimonials[0].rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-kc-yellow text-kc-yellow" />
                  ))}
                </div>
                <blockquote className="text-2xl font-medium leading-snug text-kc-dark">
                  &ldquo;{testimonials[0].text}&rdquo;
                </blockquote>
                <div className="mt-4 text-sm text-kc-muted">
                  <span className="font-semibold text-kc-dark">{testimonials[0].name}</span>
                  {testimonials[0].company ? ` · ${testimonials[0].company}` : ""}
                </div>
              </div>

              {testimonials.length > 1 && (
                <div className="space-y-4 divide-y divide-kc-border lg:border-l lg:border-kc-border lg:pl-8">
                  {testimonials.slice(1).map((t) => (
                    <div key={t.id} className="pt-4 first:pt-0">
                      <p className="text-sm leading-relaxed text-kc-dark">&ldquo;{t.text}&rdquo;</p>
                      <div className="mt-2 text-xs text-kc-muted">{t.name}{t.company ? ` · ${t.company}` : ""}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      <section className="section-pad bg-kc-bg">
        <div className="container-tight max-w-3xl">
          <div className="mb-10">
            <h2 className="text-3xl font-black tracking-tight text-kc-dark sm:text-4xl">Frequently asked questions</h2>
          </div>
          <Accordion className="space-y-3">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="rounded-md border border-kc-border px-5">
                <AccordionTrigger className="text-left font-semibold text-kc-dark hover:text-kc-teal hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="pb-4 leading-relaxed text-kc-muted">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-8">
            <Button asChild variant="outline" className="border-kc-border text-kc-dark hover:bg-kc-surface hover:border-kc-teal/30">
              <Link href="/faq">View All FAQs</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-kc-teal">
        <div className="container-tight px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <h2 className="max-w-xl text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">
                Ready to order? Pick a product and let&apos;s get started.
              </h2>
              <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-white/80">
                <a href="tel:+18165210462" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Phone className="h-4 w-4" /> (816) 521-0462
                </a>
                <a href="mailto:kansasdesigners@gmail.com" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Mail className="h-4 w-4" /> kansasdesigners@gmail.com
                </a>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button asChild size="lg" className="h-13 w-full rounded-md bg-kc-coral px-8 text-base font-semibold text-white hover:bg-kc-coral/90 sm:w-auto">
                <Link href="/services">Browse All Products</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-13 w-full rounded-md border-white/30 bg-transparent px-7 text-base text-white hover:bg-white/10 sm:w-auto">
                <Link href="/contact">Request a Quote</Link>
              </Button>
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
