import Link from "next/link";
import Image from "next/image";
import { ArrowRight, FileCheck, PenLine, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import type { ServiceDef } from "@/lib/service-data";
import type { ProductThumbnail } from "@/lib/product-thumbnails";
import { formatDollars } from "@/lib/utils";

interface ServicePageContentProps {
  service: ServiceDef;
  designStudioHref?: string;
  aiDesignHref?: string;
  heroImages?: ProductThumbnail[];
}

/* Magenta is the only interactive accent; cyan and gold live in the photography and the
   registration bar. Same button system as the homepage. */
const BTN_PRIMARY =
  "edge h-12 bg-kc-coral px-7 text-[16.05px] font-semibold text-white transition-colors hover:bg-kc-magenta-deep";
const BTN_SECONDARY =
  "edge h-12 border border-kc-dark/20 bg-transparent px-7 text-[16.05px] font-semibold text-kc-dark transition-colors hover:border-kc-dark/40 hover:bg-kc-dark/5";

/** Studio photography per product, shot for the redesign. Falls back to the card shot. */
const HERO_PHOTO: Record<string, { src: string; alt: string }> = {
  "business-cards": {
    src: "/images/print/business-cards.webp",
    alt: "Stacks of printed business cards with visible cut edges and finished branding",
  },
  postcards: {
    src: "/images/print/postcards.webp",
    alt: "A pile of printed promotional postcards on a concrete studio table",
  },
  banners: {
    src: "/images/print/banners.webp",
    alt: "A printed retractable roll-up banner stand beside its aluminium cassette",
  },
  "rigid-signs": {
    src: "/images/print/rigid-signs.webp",
    alt: "Four die-cut rigid signs leaning against a studio wall",
  },
};

export function ServicePageContent({
  service,
  designStudioHref,
  aiDesignHref,
  heroImages,
}: ServicePageContentProps) {
  const photo = HERO_PHOTO[service.slug] ?? HERO_PHOTO["business-cards"];
  const orderHref = `/services/${service.slug}/order`;
  const lower = service.name.toLowerCase();

  return (
    <>
      {/* ── Hero: h1 carries the product name, tagline drops to subtext ── */}
      <section className="relative bg-kc-bg">
        <div className="reg-bar relative z-20" />

        <div className="container-tight flex items-center px-4 pb-4 pt-14 sm:px-6 lg:min-h-[500px] lg:px-8 lg:py-16">
          <div className="lg:max-w-[52%]">
            <Reveal y={16}>
              <h1 className="display-tight text-[2.94rem] text-kc-dark sm:text-6xl lg:text-[3.75rem]">
                {service.name}
              </h1>
            </Reveal>
            <Reveal y={16} delay={0.08}>
              <p className="mt-6 max-w-[46ch] text-[18.19px] leading-relaxed text-kc-dark/75">
                {service.tagline}
              </p>
            </Reveal>
            <Reveal y={16} delay={0.16}>
              <div className="mt-9 flex flex-wrap gap-3">
                {designStudioHref ? (
                  <>
                    <Button asChild size="lg" className={BTN_PRIMARY}>
                      <Link href={designStudioHref}>
                        Start designing <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className={BTN_SECONDARY}>
                      <Link href={orderHref}>Order without designing</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild size="lg" className={BTN_PRIMARY}>
                      <Link href={orderHref}>
                        Order <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className={BTN_SECONDARY}>
                      <Link href="/contact">Contact us</Link>
                    </Button>
                  </>
                )}
              </div>
            </Reveal>
          </div>
        </div>

        {/* Capped and kept short so the panel stays near the photograph's native 4:3 ratio. */}
        <div className="px-4 pb-16 pt-10 sm:px-6 lg:absolute lg:bottom-0 lg:right-0 lg:top-[3px] lg:w-[44%] lg:max-w-[680px] lg:p-0">
          <div className="edge relative aspect-[4/3] w-full overflow-hidden lg:aspect-auto lg:h-full lg:rounded-none">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              priority
              sizes="(min-width: 1600px) 680px, (min-width: 1024px) 44vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── What's included ── */}
      <section className="border-y border-kc-dark/10 bg-kc-bg">
        <div className="container-tight px-4 sm:px-6 lg:px-8">
          <RevealGroup className="grid grid-cols-1 divide-y divide-kc-dark/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              {
                icon: PenLine,
                text: designStudioHref
                  ? "Design it yourself in the browser, free, no software"
                  : "A real designer builds the layout for you",
              },
              { icon: FileCheck, text: "Print-ready PDF, JPG, and PNG with every order" },
              { icon: RefreshCw, text: "Revisions included on every package" },
            ].map(({ icon: Icon, text }) => (
              <RevealItem
                key={text}
                className="flex items-start gap-3 py-7 sm:px-7 sm:first:pl-0 sm:last:pr-0"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-kc-coral" strokeWidth={1.75} />
                <span className="text-[15.52px] leading-snug text-kc-dark/75">{text}</span>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ── Start from a design ── */}
      {heroImages && heroImages.length > 0 && designStudioHref && (
        <section className="band-tight bg-kc-paper">
          <div className="container-tight">
            <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-xl">
                <h2 className="display-tight text-2xl text-kc-dark sm:text-[2.03rem]">
                  Start from a design
                </h2>
                <p className="mt-3 text-[16.59px] leading-relaxed text-kc-dark/70">
                  Open any of these in the editor and make it yours, or start from a blank file.
                </p>
              </div>
              <Link
                href="/portfolio"
                className="text-[14.98px] font-semibold text-kc-magenta-deep transition-colors hover:text-kc-dark"
              >
                See all examples
              </Link>
            </Reveal>

            <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {heroImages.slice(0, 3).map((img) => (
                <RevealItem key={img.slug} className="h-full">
                  <Link
                    href={`${designStudioHref}/t-${img.slug}`}
                    className="edge group flex h-full flex-col overflow-hidden border border-kc-dark/12 bg-white transition-colors hover:border-kc-dark/30"
                  >
                    {/* Mounted at true proportions. These thumbnails are 7:4 (cards), 3:2
                        (postcards), tall (banners) or square (signs) - a fixed square crop
                        chopped the artwork off every one of them. */}
                    <div className="relative aspect-[4/3] bg-kc-paper">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.title}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-contain p-6 drop-shadow-[0_6px_14px_rgba(18,17,16,0.28)] transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                      />
                    </div>
                    <div className="border-t border-kc-dark/10 px-4 py-3.5">
                      <span className="text-[14.98px] font-semibold text-kc-dark transition-colors group-hover:text-kc-magenta-deep">
                        {img.title}
                      </span>
                    </div>
                  </Link>
                </RevealItem>
              ))}
            </RevealGroup>

            {aiDesignHref && (
              <p className="mt-6 text-[15.52px] text-kc-dark/70">
                Prefer to describe it?{" "}
                <Link
                  href={aiDesignHref}
                  className="font-semibold text-kc-magenta-deep transition-colors hover:text-kc-dark"
                >
                  Generate a starting design
                </Link>{" "}
                and edit it from there.
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── Specifications ── */}
      <section className="band bg-kc-bg">
        <div className="container-tight grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <h2 className="display-tight text-3xl text-kc-dark sm:text-[2.68rem]">
              Sizes, stock, and files
            </h2>
            <p className="mt-4 max-w-sm text-[17.66px] leading-relaxed text-kc-dark/70">
              {service.description}
            </p>
          </div>

          <dl className="divide-y divide-kc-dark/10 border-t border-kc-dark/10">
            {service.specs.map((spec) => (
              <div key={spec.label} className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)] sm:gap-6">
                <dt className="text-[14.98px] font-medium text-kc-dark/70">{spec.label}</dt>
                <dd className="text-[16.05px] leading-snug text-kc-dark">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Packages ── */}
      <section className="band bg-kc-paper">
        <div className="container-tight">
          <Reveal className="mb-10 max-w-xl">
            <h2 className="display-tight text-3xl text-kc-dark sm:text-[2.94rem]">
              Choose your package
            </h2>
            <p className="mt-4 text-[17.66px] leading-relaxed text-kc-dark/70">
              Every package includes print-ready file delivery and revisions.
            </p>
          </Reveal>

          <RevealGroup
            className={`grid grid-cols-1 gap-4 ${
              service.packages.length <= 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {service.packages.map((pkg) => (
              <RevealItem key={pkg.name} className="h-full">
                {/* The popular tier inverts to ink rather than being a third identical card. */}
                <div
                  className={`edge flex h-full flex-col border p-7 ${
                    pkg.popular
                      ? "border-kc-ink bg-kc-ink text-white"
                      : "border-kc-dark/12 bg-white"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className={`text-[16.05px] font-semibold ${
                        pkg.popular ? "text-white" : "text-kc-dark"
                      }`}
                    >
                      {pkg.name}
                    </span>
                    {pkg.popular && (
                      <span className="font-mono text-[11.77px] text-white/60">Most popular</span>
                    )}
                  </div>

                  <div
                    className={`display-tight mt-4 text-[2.68rem] ${
                      pkg.popular ? "text-white" : "text-kc-dark"
                    }`}
                  >
                    {formatDollars(pkg.price)}
                  </div>

                  <ul
                    className={`mt-6 flex-1 space-y-2.5 border-t pt-6 ${
                      pkg.popular ? "border-kc-ink-line" : "border-kc-dark/10"
                    }`}
                  >
                    {pkg.features.map((f) => (
                      <li
                        key={f}
                        className={`text-[14.98px] leading-snug ${
                          pkg.popular ? "text-white/70" : "text-kc-dark/75"
                        }`}
                      >
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    className={
                      pkg.popular
                        ? "edge mt-7 h-11 w-full bg-kc-coral text-[15.52px] font-semibold text-white transition-colors hover:bg-kc-magenta-deep"
                        : "edge mt-7 h-11 w-full border border-kc-dark/20 bg-transparent text-[15.52px] font-semibold text-kc-dark transition-colors hover:border-kc-dark/40 hover:bg-kc-dark/5"
                    }
                  >
                    <Link href={`${orderHref}?package=${pkg.name.toLowerCase()}`}>
                      Select {pkg.name}
                    </Link>
                  </Button>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>

          {service.addOns.length > 0 && (
            <div className="mt-16">
              <h3 className="display-tight mb-6 text-xl text-kc-dark sm:text-2xl">
                Available add-ons
              </h3>
              <dl className="grid grid-cols-1 gap-x-12 sm:grid-cols-2">
                {service.addOns.map((addon) => (
                  // A dl group may hold dt followed by dd, and nothing else. Nesting them inside a
                  // second div - with the price as a bare span alongside - left the name and
                  // description outside any list item as far as a screen reader was concerned.
                  // A two-column grid keeps the same layout with dt and dd as direct children.
                  <div
                    key={addon.name}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 border-b border-kc-dark/10 py-4"
                  >
                    <dt className="text-[16.05px] font-semibold text-kc-dark">{addon.name}</dt>
                    <dd className="shrink-0 font-mono text-[13.91px] text-kc-dark/70">
                      +{formatDollars(addon.price)}
                    </dd>
                    <dd className="col-span-2 mt-0.5 text-[14.45px] leading-snug text-kc-dark/70">
                      {addon.desc}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="band bg-kc-bg">
        <div className="container-tight grid grid-cols-1 gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
          <h2 className="display-tight text-3xl text-kc-dark sm:text-[2.94rem]">
            {service.name} questions
          </h2>
          <Accordion className="border-t border-kc-dark/10">
            {service.faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-b border-kc-dark/10">
                <AccordionTrigger className="py-5 text-left text-[17.12px] font-semibold text-kc-dark hover:text-kc-magenta-deep hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="max-w-[62ch] pb-5 text-[16.05px] leading-relaxed text-kc-dark/75">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── Closing ink block ── */}
      <section className="bg-kc-ink">
        <div className="reg-bar" />
        <div className="container-tight px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="display-tight max-w-xl text-3xl text-white sm:text-[2.68rem]">
                Ready to order your {lower}?
              </h2>
              <p className="mt-5 max-w-md text-[16.59px] leading-relaxed text-white/60">
                Choose a package, share your brand details, and your first draft arrives in 1 to 3
                business days.
              </p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
              <Button asChild size="lg" className={`${BTN_PRIMARY} w-full sm:w-auto`}>
                <Link href={orderHref}>
                  Order <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="edge h-12 w-full border border-white/25 bg-transparent px-7 text-[16.05px] font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/10 sm:w-auto"
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
                "@type": "Service",
                name: service.name,
                provider: { "@type": "Organization", name: "611 Printing" },
                description: service.description,
                offers: service.packages.map((p) => ({
                  "@type": "Offer",
                  name: p.name,
                  price: p.price,
                  priceCurrency: "USD",
                })),
              },
              {
                "@type": "FAQPage",
                mainEntity: service.faqs.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
              },
            ],
          }),
        }}
      />
    </>
  );
}
