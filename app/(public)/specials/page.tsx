import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { getLiveSpecials } from "@/lib/specials";
import { localeAlternates } from "@/lib/i18n/metadata";

export const metadata: Metadata = {
  alternates: localeAlternates("/specials", "en"),
  title: "Current Specials",
  description:
    "Current offers and promotions from 611 Printing on business cards, postcards, banners, rigid signs, and window decals.",
};

/**
 * Re-rendered every fifteen minutes rather than on every request.
 *
 * A scheduled special has to be able to appear without a deploy, which rules out a static page, but
 * the shop is not running minute-sensitive offers either. Fifteen minutes is close enough that a
 * promotion set to start "now" is live before anyone checks, and cheap enough that the offers page
 * is not a database read per visitor.
 */
export const revalidate = 900;

const BTN_PRIMARY =
  "edge h-12 bg-kc-coral px-7 text-[16.05px] font-semibold text-white transition-colors hover:bg-kc-magenta-deep";

function endsLabel(endsAt: Date | null): string | null {
  if (!endsAt) return null;
  return `Ends ${endsAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
}

export default async function SpecialsPage() {
  const specials = await getLiveSpecials();

  return (
    <>
      <section className="bg-kc-bg">
        <div className="reg-bar" />
        <div className="container-tight px-4 pb-12 pt-16 sm:px-6 lg:px-8 lg:pb-16 lg:pt-24">
          <Reveal className="max-w-2xl">
            <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-kc-teal">Specials</div>
            <h1 className="display-tight text-4xl text-kc-dark sm:text-5xl lg:text-6xl">
              What&rsquo;s on offer right now
            </h1>
            <p className="mt-5 text-[17.66px] leading-relaxed text-kc-dark/70">
              Current promotions across print and design. Codes apply at checkout.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="band bg-kc-paper">
        <div className="container-tight">
          {specials.length === 0 ? (
            <Reveal className="max-w-xl">
              <p className="text-[17.66px] leading-relaxed text-kc-dark/70">
                No specials are running at the moment. Our everyday pricing is print at cost with no
                minimums, so it is worth a look either way.
              </p>
              <Button asChild className={`${BTN_PRIMARY} mt-6`}>
                <Link href="/services">See what we print <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </Reveal>
          ) : (
            <RevealGroup className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {specials.map((s) => (
                <RevealItem key={s.id} className="h-full">
                  {/* The id is what the promo bar and any shared link anchor to. */}
                  <article id={s.slug} className="flex h-full scroll-mt-24 flex-col border border-kc-dark/10 bg-white">
                    {s.imageUrl && (
                      <div className="relative aspect-[16/9] overflow-hidden bg-kc-bg">
                        <Image
                          src={s.imageUrl}
                          alt=""
                          fill
                          sizes="(min-width: 768px) 50vw, 100vw"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-6">
                      <h2 className="display-tight text-2xl text-kc-dark">{s.title}</h2>
                      <p className="mt-3 text-[16.05px] leading-relaxed text-kc-dark/70">{s.blurb}</p>
                      {s.body && (
                        <p className="mt-3 text-[14.98px] leading-relaxed text-kc-dark/60">{s.body}</p>
                      )}

                      <div className="mt-auto pt-6">
                        {s.couponCode && (
                          <div className="mb-4 flex items-center gap-2 text-sm text-kc-dark">
                            <Tag className="h-4 w-4 text-kc-teal" aria-hidden="true" />
                            <span>Use code</span>
                            <span className="rounded bg-kc-bg px-2 py-1 font-mono font-semibold tracking-wide">
                              {s.couponCode}
                            </span>
                          </div>
                        )}
                        {endsLabel(s.endsAt) && (
                          <p className="mb-4 text-[13.5px] text-kc-muted">{endsLabel(s.endsAt)}</p>
                        )}
                        {s.ctaHref && (
                          <Button asChild className={BTN_PRIMARY}>
                            <Link href={s.ctaHref}>
                              {s.ctaLabel ?? "Order now"} <ArrowRight className="ml-2 h-4 w-4" />
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
