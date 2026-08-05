import Link from "next/link";
import { Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The near-black closing block. It shares a surface with the footer, so the page ends in one
 * continuous run of ink rather than flipping theme at the bottom.
 *
 * CTA labels are deliberately fixed to the site's three intents (browse / design / contact) so no
 * two pages invent a fourth wording for the same action.
 */
export function ClosingCta({
  title,
  body,
  primary,
  secondary,
  showContactDetails = false,
}: {
  title: string;
  body?: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  showContactDetails?: boolean;
}) {
  return (
    <section className="bg-kc-ink">
      <div className="reg-bar" />
      <div className="container-tight px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="display-tight max-w-xl text-3xl text-white sm:text-[2.68rem]">{title}</h2>
            {body && (
              <p className="mt-5 max-w-md text-[16.59px] leading-relaxed text-white/60">{body}</p>
            )}
            {showContactDetails && (
              <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3">
                <a
                  href="tel:+18165210462"
                  className="flex items-center gap-2.5 font-mono text-[14.45px] text-white/70 transition-colors hover:text-white"
                >
                  <Phone className="h-4 w-4" strokeWidth={1.75} /> (816) 521-0462
                </a>
                <a
                  href="mailto:kansasdesigners@gmail.com"
                  className="flex items-center gap-2.5 text-[14.45px] text-white/70 transition-colors hover:text-white"
                >
                  <Mail className="h-4 w-4" strokeWidth={1.75} /> kansasdesigners@gmail.com
                </a>
              </div>
            )}
          </div>

          <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
              asChild
              size="lg"
              className="edge h-12 w-full bg-kc-coral px-7 text-[16.05px] font-semibold text-white transition-colors hover:bg-kc-magenta-deep sm:w-auto"
            >
              <Link href={primary.href}>{primary.label}</Link>
            </Button>
            {secondary && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="edge h-12 w-full border border-white/25 bg-transparent px-7 text-[16.05px] font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/10 sm:w-auto"
              >
                <Link href={secondary.href}>{secondary.label}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
