import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { getLiveSpecials } from "@/lib/specials";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localeAlternates } from "@/lib/i18n/metadata";

export const metadata: Metadata = {
  title: "Ofertas vigentes",
  description:
    "Ofertas y promociones vigentes de 611 Printing en tarjetas de presentación, postales, lonas, letreros rígidos y calcomanías para ventanas.",
  alternates: localeAlternates("/specials", "es"),
};

export const revalidate = 900;

const BTN_PRIMARY =
  "edge h-12 bg-kc-coral px-7 text-[16.05px] font-semibold text-white transition-colors hover:bg-kc-magenta-deep";

export default async function SpanishSpecialsPage() {
  const specials = await getLiveSpecials("es");
  const t = getDictionary("es").specials;

  return (
    <>
      <section className="bg-kc-bg">
        <div className="reg-bar" />
        <div className="container-tight px-4 pb-12 pt-16 sm:px-6 lg:px-8 lg:pb-16 lg:pt-24">
          <Reveal className="max-w-2xl">
            <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-kc-teal">{t.eyebrow}</div>
            <h1 className="display-tight text-4xl text-kc-dark sm:text-5xl lg:text-6xl">{t.heading}</h1>
            <p className="mt-5 text-[17.66px] leading-relaxed text-kc-dark/70">{t.intro}</p>
          </Reveal>
        </div>
      </section>

      <section className="band bg-kc-paper">
        <div className="container-tight">
          {specials.length === 0 ? (
            <Reveal className="max-w-xl">
              <p className="text-[17.66px] leading-relaxed text-kc-dark/70">{t.empty}</p>
              <Button asChild className={`${BTN_PRIMARY} mt-6`}>
                <Link href="/es/servicios">
                  {getDictionary("es").common.seeAll} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </Reveal>
          ) : (
            <RevealGroup className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {specials.map((s) => (
                <RevealItem key={s.id} className="h-full">
                  <article id={s.slug} className="flex h-full scroll-mt-24 flex-col border border-kc-dark/10 bg-white">
                    {s.imageUrl && (
                      <div className="relative aspect-[16/9] overflow-hidden bg-kc-bg">
                        <Image src={s.imageUrl} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-6">
                      <h2 className="display-tight text-2xl text-kc-dark">{s.title}</h2>
                      <p className="mt-3 text-[16.05px] leading-relaxed text-kc-dark/70">{s.blurb}</p>
                      {s.body && <p className="mt-3 text-[14.98px] leading-relaxed text-kc-dark/60">{s.body}</p>}

                      <div className="mt-auto pt-6">
                        {s.couponCode && (
                          <div className="mb-4 flex items-center gap-2 text-sm text-kc-dark">
                            <Tag className="h-4 w-4 text-kc-teal" aria-hidden="true" />
                            <span>{t.useCode}</span>
                            <span className="rounded bg-kc-bg px-2 py-1 font-mono font-semibold tracking-wide">{s.couponCode}</span>
                          </div>
                        )}
                        {s.endsAt && (
                          <p className="mb-4 text-[13.5px] text-kc-muted">
                            {/* Formatted with the Spanish locale so the month reads "marzo", not "March". */}
                            {t.ends} {s.endsAt.toLocaleDateString("es-US", { day: "numeric", month: "long", year: "numeric" })}
                          </p>
                        )}
                        {s.ctaHref && (
                          <Button asChild className={BTN_PRIMARY}>
                            <Link href={s.ctaHref}>
                              {s.ctaLabel ?? getDictionary("es").common.orderNow} <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                </RevealItem>
              ))}
            </RevealGroup>
          )}
        </div>
      </section>
    </>
  );
}
