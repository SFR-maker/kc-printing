import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { ServiceDef } from "@/lib/service-data";
import { formatDollars } from "@/lib/utils";

interface ServicePageContentProps {
  service: ServiceDef;
  designStudioHref?: string;
}

export function ServicePageContent({ service, designStudioHref }: ServicePageContentProps) {
  return (
    <>
      {/* Hero */}
      <section className="section-pad-tight bg-kc-bg">
        <div className="container-tight max-w-3xl">
          <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-kc-teal">{service.name}</div>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-kc-dark sm:text-5xl">{service.tagline}</h1>
          <p className="mb-8 text-lg leading-relaxed text-kc-muted">{service.description}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {designStudioHref ? (
              <Button asChild size="lg" className="rounded-md bg-kc-coral text-white hover:bg-kc-coral/90">
                <Link href={designStudioHref}>
                  Design It Yourself <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="rounded-md bg-kc-coral text-white hover:bg-kc-coral/90">
                <Link href={`/services/${service.slug}/order`}>
                  Order Now <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button asChild size="lg" variant="outline" className="rounded-md border-kc-border text-kc-dark hover:bg-kc-surface">
              <Link href={designStudioHref ? `/services/${service.slug}/order` : "/contact"}>
                {designStudioHref ? "Order Without Designing" : "Get a Free Quote"}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Specs */}
      <section className="section-pad bg-white">
        <div className="container-tight">
          <h2 className="mb-6 text-2xl font-bold text-kc-dark">Specifications and file info</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {service.specs.map((spec) => (
              <div key={spec.label} className="rounded-md border border-kc-border bg-kc-bg p-4">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-kc-muted">{spec.label}</div>
                <div className="text-sm font-medium text-kc-dark">{spec.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="section-pad bg-kc-bg">
        <div className="container-tight">
          <div className="mb-10 max-w-xl">
            <h2 className="mb-3 text-3xl font-black tracking-tight text-kc-dark sm:text-4xl">Choose your package</h2>
            <p className="text-kc-muted">All packages include print-ready file delivery and included revisions.</p>
          </div>
          <div className={`grid grid-cols-1 gap-4 ${service.packages.length <= 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-3"}`}>
            {service.packages.map((pkg) => (
              <div
                key={pkg.name}
                className={`rounded-md border p-5 ${pkg.popular ? "border-kc-teal bg-kc-violet-tint" : "border-kc-border bg-white"}`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-kc-muted">{pkg.name}</span>
                  {pkg.popular && <span className="text-[10px] font-bold uppercase tracking-wide text-kc-teal">Most popular</span>}
                </div>
                <div className="mb-4 text-3xl font-black text-kc-dark">{formatDollars(pkg.price)}</div>
                <ul className="mb-5 space-y-2">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-kc-muted">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-kc-teal" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={`w-full rounded-md ${pkg.popular ? "bg-kc-teal text-white hover:bg-kc-teal/90" : "bg-kc-dark text-white hover:bg-kc-dark/90"}`}
                >
                  <Link href={`/services/${service.slug}/order?package=${pkg.name.toLowerCase()}`}>
                    Select {pkg.name}
                  </Link>
                </Button>
              </div>
            ))}
          </div>

          {/* Add-ons */}
          {service.addOns.length > 0 && (
            <div className="mt-10">
              <h3 className="mb-4 text-xl font-bold text-kc-dark">Available add-ons</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {service.addOns.map((addon) => (
                  <div key={addon.name} className="rounded-md border border-kc-border bg-white p-4">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-kc-dark">{addon.name}</span>
                      <span className="shrink-0 text-xs font-semibold text-kc-teal">+{formatDollars(addon.price)}</span>
                    </div>
                    <p className="text-xs text-kc-muted">{addon.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="section-pad bg-white">
        <div className="container-tight max-w-3xl">
          <h2 className="mb-8 text-3xl font-black tracking-tight text-kc-dark sm:text-4xl">{service.name} FAQs</h2>
          <Accordion className="space-y-3">
            {service.faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-md border border-kc-border px-5"
              >
                <AccordionTrigger className="text-left font-semibold text-kc-dark hover:text-kc-teal hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="pb-4 leading-relaxed text-kc-muted">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-kc-teal">
        <div className="container-tight px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
          <h2 className="mb-4 text-3xl font-black text-white">Ready to order your {service.name.toLowerCase()}?</h2>
          <p className="mx-auto mb-8 max-w-xl text-white/80">
            Choose a package, share your brand info, and receive your design within 1-3 business days. Revisions included.
          </p>
          <Button asChild size="lg" className="rounded-md bg-kc-coral px-8 text-white hover:bg-kc-coral/90">
            <Link href={`/services/${service.slug}/order`}>
              Start Your Order <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
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
                provider: { "@type": "Organization", name: "KC Printing" },
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
