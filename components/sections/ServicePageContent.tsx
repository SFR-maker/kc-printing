import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { ServiceDef } from "@/lib/service-data";
import { formatDollars } from "@/lib/utils";

export function ServicePageContent({ service }: { service: ServiceDef }) {
  return (
    <>
      {/* Hero */}
      <section className="bg-kc-dark text-white section-pad">
        <div className="container-tight">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-kc-coral/20 text-kc-coral border-kc-coral/30 hover:bg-kc-coral/20">
              {service.name}
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-black mb-4">{service.tagline}</h1>
            <p className="text-lg text-white/70 leading-relaxed mb-8">{service.description}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="bg-kc-coral hover:bg-kc-coral/90 text-white">
                <Link href={`/services/${service.slug}/order`}>
                  Order Now <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Link href="/contact">Get a Free Quote</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Specs */}
      <section className="section-pad bg-white">
        <div className="container-tight">
          <h2 className="text-2xl font-bold text-kc-dark mb-6">Specifications and File Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {service.specs.map((spec) => (
              <div key={spec.label} className="rounded-lg border border-kc-border bg-kc-bg p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-kc-muted mb-1">{spec.label}</div>
                <div className="text-sm font-medium text-kc-dark">{spec.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="section-pad bg-kc-bg">
        <div className="container-tight">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-kc-dark mb-3">Choose Your Package</h2>
            <p className="text-kc-muted">All packages include print-ready file delivery and included revisions.</p>
          </div>
          <div className={`grid grid-cols-1 gap-6 ${service.packages.length <= 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-3"}`}>
            {service.packages.map((pkg) => (
              <Card
                key={pkg.name}
                className={`relative border-2 ${pkg.popular ? "border-kc-teal shadow-lg" : "border-kc-border"}`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-kc-teal text-white border-0 px-3">Most Popular</Badge>
                  </div>
                )}
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="mb-4">
                    <div className="text-sm font-semibold uppercase tracking-wider text-kc-muted mb-1">{pkg.name}</div>
                    <div className="text-4xl font-black text-kc-dark">{formatDollars(pkg.price)}</div>
                  </div>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {pkg.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-kc-muted">
                        <CheckCircle2 className="h-4 w-4 text-kc-teal shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className={`w-full ${pkg.popular ? "bg-kc-teal hover:bg-kc-teal/90 text-white" : "bg-kc-dark hover:bg-kc-dark/90 text-white"}`}
                  >
                    <Link href={`/services/${service.slug}/order?package=${pkg.name.toLowerCase()}`}>
                      Select {pkg.name}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add-ons */}
          {service.addOns.length > 0 && (
            <div className="mt-10">
              <h3 className="text-xl font-bold text-kc-dark mb-4">Available Add-Ons</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {service.addOns.map((addon) => (
                  <div key={addon.name} className="rounded-lg border border-kc-border bg-white p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-kc-dark">{addon.name}</span>
                      <Badge className="bg-kc-yellow/30 text-kc-dark border-0 text-xs">+{formatDollars(addon.price)}</Badge>
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
          <h2 className="text-3xl font-black text-kc-dark mb-8 text-center">{service.name} FAQs</h2>
          <Accordion className="space-y-2">
            {service.faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border border-kc-border rounded-lg px-4"
              >
                <AccordionTrigger className="text-left font-semibold text-kc-dark hover:text-kc-teal hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-kc-muted leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="section-pad bg-kc-teal text-white">
        <div className="container-tight text-center">
          <h2 className="text-3xl font-black mb-4">Ready to Order Your {service.name}?</h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Choose a package, share your brand info, and receive your design within 1-3 business days. Revisions included.
          </p>
          <Button asChild size="lg" className="bg-kc-coral hover:bg-kc-coral/90 text-white px-8">
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
