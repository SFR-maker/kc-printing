import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { SERVICES_ES } from "@/lib/service-data-es";
import { startingPriceLabel } from "@/lib/pricing/starting-prices";
import { formatDollars } from "@/lib/utils";
import { SERVICE_SLUG_ES } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/i18n/metadata";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const metadata: Metadata = {
  title: "Precios",
  description:
    "Impresión vendida a costo y paquetes de diseño con precio claro para tarjetas de presentación, postales, lonas, letreros rígidos y calcomanías para ventanas.",
  alternates: localeAlternates("/pricing", "es"),
};

export const revalidate = 3600;

const BTN_PRIMARY =
  "edge h-12 bg-kc-coral px-7 text-[16.05px] font-semibold text-white transition-colors hover:bg-kc-magenta-deep";

/**
 * Built from SERVICES_ES rather than from a second hand-maintained list.
 *
 * The English pricing page keeps its own abbreviated copy of every package, which means a price
 * changed in service-data has to be remembered in two places. Deriving it here means the Spanish
 * page cannot quote a figure the product page disagrees with.
 */
const ORDER = ["business-cards", "postcards", "banners", "rigid-signs", "window-decals"];

export default function SpanishPricingPage() {
  const t = getDictionary("es");

  return (
    <>
      <section className="bg-kc-bg">
        <div className="reg-bar" />
        <div className="container-tight px-4 pb-12 pt-16 sm:px-6 lg:px-8 lg:pb-16 lg:pt-24">
          <Reveal className="max-w-2xl">
            <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-kc-teal">{t.pricing.eyebrow}</div>
            <h1 className="display-tight text-4xl text-kc-dark sm:text-5xl lg:text-6xl">{t.pricing.heading}</h1>
            <p className="mt-5 text-[17.66px] leading-relaxed text-kc-dark/70">{t.pricing.intro}</p>
          </Reveal>
        </div>
      </section>

      {ORDER.map((slug, index) => {
        const service = SERVICES_ES[slug];
        if (!service) return null;
        return (
          <section key={slug} className={index % 2 === 0 ? "band bg-kc-paper" : "band bg-kc-bg"}>
            <div className="container-tight">
              <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-xl">
                  <h2 className="display-tight text-3xl text-kc-dark sm:text-[2.4rem]">{service.name}</h2>
                  <p className="mt-3 text-[16.05px] leading-relaxed text-kc-dark/70">
                    Impresión {startingPriceLabel(slug).replace("from", t.common.from)}. {t.pricing.printSeparate}.
                  </p>
                </div>
                <Link
                  href={`/es/servicios/${SERVICE_SLUG_ES[slug]}`}
                  className="text-[14.98px] font-semibold text-kc-magenta-deep transition-colors hover:text-kc-dark"
                >
                  {t.common.learnMore} →
                </Link>
              </Reveal>

              <RevealGroup className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {service.packages.map((pkg) => (
                  <RevealItem key={pkg.name} className="h-full">
                    <div
                      className={`flex h-full flex-col border bg-white p-6 ${
                        pkg.popular ? "border-kc-coral" : "border-kc-dark/12"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="text-[18.19px] font-bold text-kc-dark">{pkg.name}</h3>
                        {pkg.popular && (
                          <span className="shrink-0 bg-kc-coral px-2 py-0.5 text-[11.5px] font-semibold uppercase tracking-wide text-white">
                            {t.common.mostPopular}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 font-mono text-3xl font-black text-kc-dark">{formatDollars(pkg.price)}</div>
                      <ul className="mt-5 space-y-2.5">
                        {pkg.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-[14.98px] leading-snug text-kc-dark/75">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kc-teal" strokeWidth={2.25} />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </RevealItem>
                ))}
              </RevealGroup>
            </div>
          </section>
        );
      })}

      <section className="bg-kc-ink">
        <div className="reg-bar" />
        <div className="container-tight px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="display-tight max-w-xl text-3xl text-white sm:text-[2.68rem]">
                ¿Ya tiene su archivo listo?
              </h2>
              <p className="mt-5 max-w-md text-[16.59px] leading-relaxed text-white/60">
                Entonces no necesita ningún paquete de diseño. Suba su arte y pague solo la impresión,
                al costo.
              </p>
            </div>
            <Button asChild size="lg" className={`${BTN_PRIMARY} shrink-0`}>
              <Link href="/es/servicios">
                {t.common.seeAll} <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
