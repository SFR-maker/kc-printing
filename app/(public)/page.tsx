import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Star, Phone, Mail, FileCheck, Users2, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { db } from "@/lib/prisma";
import { APP_URL } from "@/lib/app-url";

export const metadata: Metadata = {
  title: "KC Printing - Business Cards, Postcards, Banners & Rigid Signs | Kansas City",
  description:
    "Custom business cards, postcards, banners, and rigid signs. Fast online ordering, print-ready files. Serving Kansas City, Dallas, Plano, and nationwide.",
};

// Homepage pulls live testimonials from the DB (see below) — revalidate periodically so a newly
// approved testimonial shows up without requiring a full redeploy.
export const revalidate = 3600;

const SERVICES = [
  {
    name: "Business Cards",
    href: "/services/business-cards",
    orderHref: "/services/business-cards/order",
    image: "/images/print/business-cards.webp",
    alt: "Three stacks of printed business cards in cyan, magenta, and gold with visible cut edges",
    price: "from $39",
    sizes: "Standard, square, slim, circle, or leaf shapes",
    bestFor: "Networking, trade shows, front-desk stacks",
  },
  {
    name: "Postcards",
    href: "/services/postcards",
    orderHref: "/services/postcards/order",
    image: "/images/print/postcards.webp",
    alt: "A loose pile of printed postcards on a concrete surface",
    price: "from $49",
    sizes: "3×5 up to 6×11, EDDM-ready",
    bestFor: "Mailers, promotions, seasonal campaigns",
  },
  {
    name: "Banners",
    href: "/services/banners",
    orderHref: "/services/banners/order",
    image: "/images/print/banners.webp",
    alt: "A retractable roll-up banner stand printed with cyan, magenta, and gold bands",
    price: "from $79",
    sizes: "Roll-up stands or vinyl, 24″ up to 10 ft",
    bestFor: "Storefronts, trade shows, events",
  },
  {
    name: "Rigid Signs",
    href: "/services/rigid-signs",
    orderHref: "/services/rigid-signs/order",
    image: "/images/print/rigid-signs.webp",
    alt: "Four die-cut rigid signs leaning against a studio wall",
    price: "from $59",
    sizes: "Circle, star, arrow, house, or rounded square",
    bestFor: "Offices, storefronts, yard and event signage",
  },
];

const GUARANTEES = [
  { icon: FileCheck, text: "Print-ready PDF, JPG, and PNG with every order" },
  { icon: Users2, text: "A real designer on every file, never a template swap" },
  { icon: Clock3, text: "First draft back in 1 to 3 business days" },
];

const PROCESS = [
  {
    title: "Choose a format and a package",
    desc: "Pick the product and tier you need, then add any extras. The price updates as you go, so there is no guessing.",
  },
  {
    title: "Send your artwork, or just the idea",
    desc: "Have a finished file? Upload it. Starting from scratch? Our brief tool and design team help you get there.",
  },
  {
    title: "Review, revise, and download",
    desc: "Your first draft arrives in 1 to 3 business days. Request changes, approve the final version, and download your print-ready files.",
  },
];

const FAQS = [
  { q: "How does the ordering process work?", a: "Choose your product and package, upload your artwork or notes, and our designers get to work. You'll see your first draft within 1-3 business days. Request revisions and download your print-ready files once you approve." },
  { q: "What file formats do you deliver?", a: "Business cards, postcards, banners, and rigid signs all come as a print-ready PDF with proper bleed (and a die line for rigid signs), plus a high-resolution JPG and PNG, ready to send to any print shop, including ours." },
  { q: "I don't have a finished design. Can you still help?", a: "Yes. Upload a logo, some brand colors, or just tell us what you're going for, and our AI-assisted brief tool helps capture the direction before a real designer starts the layout." },
  { q: "Can I request revisions?", a: "Yes. Every package includes 4 to 8 revisions depending on the tier. Need more than that? Additional revisions are available at a flat rate." },
  { q: "Do you serve businesses outside Kansas City?", a: "We do. KC Printing is based in Kansas City but works with businesses in Dallas, Plano, Overland Park, and nationwide. All ordering and file delivery happens online." },
];

/* Shared button treatments. Magenta is the page's only interactive accent; cyan and gold appear
   solely in the photography and the registration bar. */
const BTN_PRIMARY =
  "edge h-12 bg-kc-coral px-7 text-[15px] font-semibold text-white transition-colors hover:bg-kc-magenta-deep";
const BTN_SECONDARY =
  "edge h-12 border border-kc-dark/20 bg-transparent px-7 text-[15px] font-semibold text-kc-dark transition-colors hover:border-kc-dark/40 hover:bg-kc-dark/5";

export default async function HomePage() {
  // Real customer testimonials only, moderated via /admin/testimonials. No fallback fake
  // quotes — the section below renders nothing until real reviews exist and are approved.
  const testimonials = await db.testimonial.findMany({
    where: { approved: true, featured: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const [lead, ...rest] = testimonials;

  return (
    <>
      {/* ── Hero: asymmetric split, photograph bleeding off the right edge ── */}
      <section className="relative bg-kc-bg">
        {/* z-20 keeps the bar above the bleed photo, which is anchored to the section's top edge */}
        <div className="reg-bar relative z-20" />

        <div className="container-tight flex items-center px-4 pb-4 pt-14 sm:px-6 lg:min-h-[520px] lg:px-8 lg:py-16">
          <div className="lg:max-w-[52%]">
            <Reveal y={16}>
              <h1 className="display-tight text-[2.75rem] text-kc-dark sm:text-6xl lg:text-[3.5rem] xl:text-[4.25rem]">
                Print, done properly.
              </h1>
            </Reveal>

            <Reveal y={16} delay={0.08}>
              <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-kc-dark/65">
                Business cards, postcards, banners, and rigid signs, built into print-ready files
                by a real designer.
              </p>
            </Reveal>

            <Reveal y={16} delay={0.16}>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button asChild size="lg" className={BTN_PRIMARY}>
                  <Link href="/services">
                    Browse products <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className={BTN_SECONDARY}>
                  <Link href="/services/business-cards/design">Start designing</Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </div>

        {/* One <Image>: an inline block on mobile, a full-height bleed panel from lg up. */}
        {/* The panel is capped and the hero kept short so this stays near the photograph's native 4:3.
            A taller panel crops a landscape frame into a near-square, which reads as a zoom and
            forces the browser to upscale a 1200px source. */}
        <div className="px-4 pb-16 pt-10 sm:px-6 lg:absolute lg:bottom-0 lg:right-0 lg:top-[3px] lg:w-[46%] lg:max-w-[720px] lg:p-0">
          <div className="edge relative aspect-[4/3] w-full overflow-hidden lg:aspect-auto lg:h-full lg:rounded-none">
            <Image
              src="/images/print/hero-card-fan.webp"
              alt="A fanned spread of printed business cards in cyan, magenta, gold, and black showing their layered cut edges"
              fill
              priority
              sizes="(min-width: 1600px) 720px, (min-width: 1024px) 46vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── What every order includes ── */}
      <section className="border-y border-kc-dark/10 bg-kc-bg">
        <div className="container-tight px-4 sm:px-6 lg:px-8">
          <RevealGroup className="grid grid-cols-1 divide-y divide-kc-dark/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {GUARANTEES.map(({ icon: Icon, text }) => (
              <RevealItem
                key={text}
                className="flex items-start gap-3 py-7 sm:px-7 sm:first:pl-0 sm:last:pr-0"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-kc-coral" strokeWidth={1.75} />
                <span className="text-[14.5px] leading-snug text-kc-dark/75">{text}</span>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ── Products: four items, four cells, no filler tiles ── */}
      <section className="band bg-kc-paper">
        <div className="container-tight">
          <Reveal className="mb-12 max-w-xl">
            <h2 className="display-tight text-3xl text-kc-dark sm:text-[2.75rem]">
              Four products. Done well.
            </h2>
            <p className="mt-4 text-[16.5px] leading-relaxed text-kc-dark/60">
              We keep the catalog focused so every order gets real attention from a designer who
              knows the format.
            </p>
          </Reveal>

          {/* 4 products, 4 cells, exact fill. Column spans alternate 3/2 then 2/3 so the grid has a
              diagonal rhythm instead of four equal cards. */}
          <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <RevealItem className="h-full sm:col-span-2 lg:col-span-3">
              <ProductTile service={SERVICES[0]} wide />
            </RevealItem>

            <RevealItem className="h-full lg:col-span-2">
              <ProductTile service={SERVICES[1]} />
            </RevealItem>

            <RevealItem className="h-full lg:col-span-2">
              <ProductTile service={SERVICES[2]} />
            </RevealItem>

            <RevealItem className="h-full sm:col-span-2 lg:col-span-3">
              <ProductTile service={SERVICES[3]} wide />
            </RevealItem>
          </RevealGroup>
        </div>
      </section>

      {/* ── Full-bleed press sheet. No copy: the craft is the message. ── */}
      <section aria-hidden className="relative h-[220px] w-full overflow-hidden md:h-[340px]">
        <Image
          src="/images/print/press-sheet.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
      </section>

      {/* ── Process: sticky headline, scrolling entries ── */}
      <section className="band bg-kc-bg">
        <div className="container-tight grid grid-cols-1 gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="display-tight text-3xl text-kc-dark sm:text-[2.75rem]">How it works</h2>
            <p className="mt-4 max-w-sm text-[16.5px] leading-relaxed text-kc-dark/60">
              From a rough idea to files you can send to any press, in three steps.
            </p>
          </div>

          <RevealGroup className="divide-y divide-kc-dark/10 border-t border-kc-dark/10">
            {PROCESS.map((item) => (
              <RevealItem key={item.title} className="py-9 first:pt-9">
                <h3 className="display-tight text-[1.6rem] text-kc-dark sm:text-[1.85rem]">
                  {item.title}
                </h3>
                <p className="mt-3 max-w-[58ch] text-[15.5px] leading-relaxed text-kc-dark/60">
                  {item.desc}
                </p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ── Design help: copy set into the empty side of the photograph ── */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/images/print/proof-desk.webp"
          alt="Printed proof cards, paper stock samples, a steel ruler and a printer's loupe on a concrete studio table"
          fill
          sizes="100vw"
          className="-z-10 object-cover object-right"
        />
        {/* Scrim guarantees text contrast regardless of where the photo crops */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-kc-bg via-kc-bg/92 to-kc-bg/0 md:via-kc-bg/80 md:to-transparent" />

        <div className="container-tight px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
          <Reveal className="max-w-lg">
            <h2 className="display-tight text-3xl text-kc-dark sm:text-[2.5rem]">
              Have the idea, not the file?
            </h2>
            <p className="mt-4 text-[16.5px] leading-relaxed text-kc-dark/70">
              You don&apos;t need to be a designer to order from us. Tell us what you&apos;re
              picturing, upload a logo or a few references, and a real person builds the layout.
            </p>
            <Button asChild size="lg" className={`${BTN_PRIMARY} mt-8`}>
              <Link href="/services/business-cards/design">Start designing</Link>
            </Button>
          </Reveal>
        </div>
      </section>

      {/* ── Testimonials (real, admin-moderated — hidden until at least one exists) ── */}
      {lead && (
        <section className="band bg-kc-paper">
          <div className="container-tight max-w-4xl">
            <Reveal>
              <div className="mb-5 flex gap-1">
                {Array.from({ length: lead.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-kc-yellow text-kc-yellow" />
                ))}
              </div>
              <blockquote className="display-tight text-[1.75rem] leading-[1.25] text-kc-dark sm:text-[2.25rem]">
                &ldquo;{lead.text}&rdquo;
              </blockquote>
              <div className="mt-6 text-sm text-kc-dark/55">
                <span className="font-semibold text-kc-dark">{lead.name}</span>
                {lead.company ? `, ${lead.company}` : ""}
              </div>
            </Reveal>

            {rest.length > 0 && (
              <RevealGroup className="mt-14 grid grid-cols-1 gap-8 border-t border-kc-dark/10 pt-10 sm:grid-cols-2">
                {rest.map((t) => (
                  <RevealItem key={t.id}>
                    <p className="line-clamp-3 text-[15px] leading-relaxed text-kc-dark/80">
                      &ldquo;{t.text}&rdquo;
                    </p>
                    <div className="mt-3 text-xs text-kc-dark/50">
                      {t.name}
                      {t.company ? `, ${t.company}` : ""}
                    </div>
                  </RevealItem>
                ))}
              </RevealGroup>
            )}
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      <section className="band bg-kc-bg">
        <div className="container-tight grid grid-cols-1 gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
          <h2 className="display-tight text-3xl text-kc-dark sm:text-[2.75rem]">
            Frequently asked questions
          </h2>

          <div>
            <Accordion className="border-t border-kc-dark/10">
              {FAQS.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-b border-kc-dark/10">
                  <AccordionTrigger className="py-5 text-left text-[16px] font-semibold text-kc-dark hover:text-kc-magenta-deep hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="max-w-[62ch] pb-5 text-[15px] leading-relaxed text-kc-dark/65">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <Button asChild variant="outline" className={`${BTN_SECONDARY} mt-8`}>
              <Link href="/faq">View all FAQs</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Closing block. The page ends in ink and runs straight into the footer. ── */}
      <section className="bg-kc-ink">
        <div className="reg-bar" />
        <div className="container-tight px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="display-tight max-w-2xl text-3xl text-white sm:text-[2.75rem]">
                Ready to order? Pick a product and let&apos;s get started.
              </h2>
              <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
                <a
                  href="tel:+18165210462"
                  className="flex items-center gap-2.5 font-mono text-[13.5px] text-white/70 transition-colors hover:text-white"
                >
                  <Phone className="h-4 w-4" strokeWidth={1.75} /> (816) 521-0462
                </a>
                <a
                  href="mailto:kansasdesigners@gmail.com"
                  className="flex items-center gap-2.5 text-[13.5px] text-white/70 transition-colors hover:text-white"
                >
                  <Mail className="h-4 w-4" strokeWidth={1.75} /> kansasdesigners@gmail.com
                </a>
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
              <Button asChild size="lg" className={`${BTN_PRIMARY} w-full sm:w-auto`}>
                <Link href="/services">Browse products</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="edge h-12 w-full border border-white/25 bg-transparent px-7 text-[15px] font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/10 sm:w-auto"
              >
                <Link href="/contact">Contact us</Link>
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
                // LocalBusiness rather than Organization: this is a print shop with a service area
                // and opening hours, and that is what local search results are built from.
                "@type": "LocalBusiness",
                "@id": `${APP_URL}/#business`,
                name: "KC Printing",
                // Was hardcoded to https://kcprinting.com, a domain the site is not served from,
                // which pointed every structured-data consumer at the wrong host.
                url: APP_URL,
                address: {
                  "@type": "PostalAddress",
                  // The business is in Shawnee, Kansas - a Kansas City metro suburb. The brand
                  // markets as "Kansas City", which is normal, but the PostalAddress has to be the
                  // real one: Google cross-checks it against the Google Business Profile, and a
                  // mismatch weakens local ranking rather than broadening it.
                  addressLocality: "Shawnee",
                  addressRegion: "KS",
                  postalCode: "66203",
                  addressCountry: "US",
                },
                priceRange: "$$",
                openingHoursSpecification: {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                  opens: "09:00",
                  closes: "18:00",
                },
                telephone: "+18165210462",
                email: "kansasdesigners@gmail.com",
                description: "Fully online print and design services studio.",
                // Was claiming Dallas, Plano and Addison TX for a Kansas City print shop - inherited from
                // another project. Inflated service areas read as untrustworthy in local search, and
                // the Terms already say Kansas City plus nationwide shipping.
                areaServed: ["Shawnee, KS", "Overland Park, KS", "Lenexa, KS", "Kansas City, KS", "Kansas City, MO", "United States"],
              },
            ],
          }),
        }}
      />
    </>
  );
}

type Service = (typeof SERVICES)[number];

/**
 * Product tile. `wide` is set on the two tiles that span 3 of 5 columns: they get a letterbox crop
 * and a larger heading, which is what keeps the grid from reading as four equal cards.
 */
function ProductTile({ service, wide = false }: { service: Service; wide?: boolean }) {
  return (
    <div className="edge group flex h-full flex-col overflow-hidden border border-kc-dark/12 bg-white transition-colors hover:border-kc-dark/30">
      <Link
        href={service.href}
        aria-label={service.name}
        className={`relative block overflow-hidden bg-kc-paper ${
          // 16:9 clipped the tops off the taller pieces in the rigid-sign shot; 16:10 keeps the
          // letterbox rhythm without cutting into the subject.
          wide ? "aspect-[4/3] lg:aspect-[16/10]" : "aspect-[4/3]"
        }`}
      >
        <Image
          src={service.image}
          alt={service.alt}
          fill
          sizes={wide ? "(min-width: 1024px) 58vw, 100vw" : "(min-width: 1024px) 39vw, 50vw"}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
      </Link>

      <div className={`flex flex-1 flex-col ${wide ? "p-7 lg:p-8" : "p-6"}`}>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <Link href={service.href}>
            <h3
              className={`display-tight text-kc-dark transition-colors group-hover:text-kc-magenta-deep ${
                wide ? "text-2xl lg:text-[1.9rem]" : "text-xl"
              }`}
            >
              {service.name}
            </h3>
          </Link>
          <span className="shrink-0 font-mono text-[12.5px] text-kc-dark/50">{service.price}</span>
        </div>

        <dl
          className={`space-y-1.5 leading-snug text-kc-dark/60 ${
            wide ? "text-[14.5px]" : "text-[13.5px]"
          }`}
        >
          <div className="flex gap-1.5">
            <dt className="shrink-0 font-medium text-kc-dark/80">Sizes:</dt>
            <dd>{service.sizes}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="shrink-0 font-medium text-kc-dark/80">Best for:</dt>
            <dd>{service.bestFor}</dd>
          </div>
        </dl>

        <div className="mt-auto pt-6">
          <Link
            href={service.orderHref}
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-kc-magenta-deep transition-colors hover:text-kc-dark"
          >
            Order
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={2}
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
