import Link from "next/link";
import type { PublicSpecial } from "@/lib/specials-shared";
import { PromoBarDismiss } from "@/components/layout/PromoBarDismiss";

/**
 * The site-wide promotion strip.
 *
 * Rendered on the server, markup and all. The obvious implementation - a client component that reads
 * localStorage in an effect and returns null until it knows - produces a strip that appears one
 * frame after hydration and shoves the header, and the whole page under it, down the screen. At the
 * very top of every page that is the most disruptive possible place for a layout shift.
 *
 * So the bar ships in the HTML and a tiny script hides it again *before paint* if this visitor has
 * already dismissed it. That is the same trick a theme toggle uses to avoid a flash of the wrong
 * colour scheme, and it is the only way to be correct in both directions: no shift for a new
 * visitor, no flash for a returning one.
 *
 * Dismissal is remembered per special, keyed by slug rather than by one "bar dismissed" flag:
 * closing March's sale must not also hide April's. It lives in localStorage because it is a display
 * preference the server has no use for, and a cookie would vary the cached HTML of every page for
 * the sake of one strip.
 */
export function PromoBar({ special }: { special: PublicSpecial | null }) {
  if (!special) return null;

  const href = special.ctaHref ?? `/specials#${special.slug}`;
  const domId = `promo-bar-${special.slug}`;

  return (
    <>
      <div id={domId} className="relative bg-kc-ink text-white">
        <div className="container-tight flex items-center justify-center gap-3 px-10 py-2.5 text-center sm:px-12">
          <p className="text-[14.5px] leading-snug">
            <span className="font-semibold">{special.title}</span>
            <span className="mx-2 text-white/40" aria-hidden="true">·</span>
            <span className="text-white/80">{special.blurb}</span>
            {special.couponCode && (
              <>
                <span className="mx-2 text-white/40" aria-hidden="true">·</span>
                <span className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[13px] font-semibold tracking-wide">
                  {special.couponCode}
                </span>
              </>
            )}
            <Link
              href={href}
              className="ml-3 whitespace-nowrap font-semibold text-kc-yellow underline underline-offset-4 hover:text-white"
            >
              {special.ctaLabel ?? "See the offer"}
            </Link>
          </p>
        </div>
        <PromoBarDismiss slug={special.slug} domId={domId} />
      </div>
      {/*
        Runs before the browser paints, so a returning visitor never sees the bar they closed.
        Deliberately not a React effect: an effect runs after paint, which is a visible flash.
        The slug is a generated URL segment ([a-z0-9-] only, see slugifySpecial), so it cannot
        break out of the string literal it is interpolated into.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{if(localStorage.getItem('kc-promo-dismissed-${special.slug}')==='1'){var e=document.getElementById('${domId}');if(e)e.style.display='none';}}catch(e){}})();`,
        }}
      />
    </>
  );
}
