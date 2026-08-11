"use client";

import { useState } from "react";
import { ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDollars } from "@/lib/utils";
import type { ShippingTier } from "@/lib/shipping/rates";

/**
 * The order summary that stays on screen while the customer configures a product.
 *
 * Every product page previously put the price at the bottom of a long form, so answering "what does
 * this cost" meant scrolling past the thing you were changing to find out what changing it did. The
 * whole point of this panel is that the number moves while you watch.
 *
 * Desktop gets a sticky right rail. Mobile gets a bar pinned to the bottom that expands - not the
 * same panel squeezed narrower, because a phone has no room for a rail and a summary that scrolls
 * away is the problem this exists to solve.
 */

export interface SummaryLine {
  label: string;
  value: string;
}

export interface OrderSummaryPanelProps {
  productName: string;
  /** Rendered SVG markup for the artwork, when there is artwork to show. */
  previewSvg?: string | null;
  /** Bitmap preview, for an uploaded file rather than a studio design. */
  previewImageUrl?: string | null;
  /** Fallback product photograph, so the panel is never an empty box. */
  fallbackImageUrl?: string;
  previewAlt?: string;
  lines: SummaryLine[];
  /** Null while a server quote is in flight. */
  total: number | null;
  loading?: boolean;
  /** Why there is no price yet - an unchosen quantity, an unavailable combination. */
  unavailableReason?: string | null;
  shippingTiers?: ShippingTier[];
  ctaLabel: string;
  onCta: () => void;
  ctaDisabled?: boolean;
  /** Shown under the CTA, e.g. that tax and shipping are added at checkout. */
  footnote?: string;
}

export function OrderSummaryPanel(props: OrderSummaryPanelProps) {
  return (
    <>
      {/*
        top-24 clears the sticky header. max-h + overflow-y matter on a laptop: with eight spec lines
        and a preview the panel is taller than a 768px viewport, and without them the CTA sits below
        the fold permanently - a sticky summary whose button you cannot reach is worse than no panel.
      */}
      <aside data-testid="order-summary" className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border-2 border-kc-border bg-white p-5 shadow-[0_2px_24px_-12px_rgba(12,10,9,0.18)]">
          <SummaryBody {...props} />
        </div>
      </aside>

      <MobileSummary {...props} />
    </>
  );
}

function SummaryBody({
  productName, previewSvg, previewImageUrl, fallbackImageUrl, previewAlt,
  lines, total, loading, unavailableReason, shippingTiers, ctaLabel, onCta, ctaDisabled, footnote,
}: OrderSummaryPanelProps) {
  /**
   * The span the offered shipping tiers cover, not the quickest of them.
   *
   * Showing the fastest tier as "estimated delivery" quotes next-day against an order the customer
   * has not chosen next-day shipping for - and probably will not, since it is the dearest option.
   * A range is the only honest thing to say before the tier is picked at checkout.
   */
  const delivery = shippingTiers?.length
    ? {
        min: Math.min(...shippingTiers.map((t) => t.minBusinessDays)),
        max: Math.max(...shippingTiers.map((t) => t.maxBusinessDays)),
      }
    : null;

  return (
    <div className="space-y-4">
      <Preview
        svg={previewSvg}
        imageUrl={previewImageUrl}
        fallbackImageUrl={fallbackImageUrl}
        alt={previewAlt ?? `${productName} preview`}
      />

      <div>
        <h2 className="text-[17px] font-bold text-kc-dark">{productName}</h2>
        <dl className="mt-2.5 space-y-1.5">
          {lines.map((l) => (
            <div key={l.label} className="flex items-baseline justify-between gap-3 text-[13.5px]">
              <dt className="shrink-0 text-kc-muted">{l.label}</dt>
              <dd className="text-right font-medium text-kc-dark">{l.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {delivery && (
        <div className="flex items-baseline justify-between gap-3 border-t border-kc-border pt-3 text-[13.5px]">
          <span className="text-kc-muted">Delivery</span>
          <span className="text-right font-medium text-kc-dark">
            {delivery.min === delivery.max
              ? `${delivery.max} business days`
              : `${delivery.min}–${delivery.max} business days`}
            <span className="block text-[12px] font-normal text-kc-muted">depending on shipping</span>
          </span>
        </div>
      )}

      <div className="border-t border-kc-border pt-3">
        <TotalRow total={total} loading={loading} unavailableReason={unavailableReason} />
      </div>

      <Button
        onClick={onCta}
        disabled={ctaDisabled || loading}
        className="edge h-12 w-full bg-kc-coral text-[16px] font-semibold text-white transition-colors hover:bg-kc-magenta-deep disabled:bg-kc-coral/30 disabled:text-white disabled:opacity-100"
      >
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Pricing…</> : ctaLabel}
      </Button>

      {footnote && <p className="text-[12.5px] leading-snug text-kc-muted">{footnote}</p>}
    </div>
  );
}

function TotalRow({
  total, loading, unavailableReason,
}: Pick<OrderSummaryPanelProps, "total" | "loading" | "unavailableReason">) {
  if (unavailableReason) {
    // Amber rather than red: nothing has gone wrong, a choice is simply outstanding.
    return <p className="text-[13.5px] leading-snug text-amber-700">{unavailableReason}</p>;
  }
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[13.5px] font-semibold uppercase tracking-wide text-kc-muted">Total</span>
      {loading || total === null ? (
        <span className="text-[15px] text-kc-muted">Pricing…</span>
      ) : (
        <span className="font-mono text-[26px] font-black leading-none text-kc-magenta-deep">
          {formatDollars(total)}
        </span>
      )}
    </div>
  );
}

function Preview({
  svg, imageUrl, fallbackImageUrl, alt,
}: { svg?: string | null; imageUrl?: string | null; fallbackImageUrl?: string; alt: string }) {
  if (svg) {
    return (
      <div
        // The SVG carries pixel width/height at its render DPI, which overflows this column; the
        // viewBox is in inches, so filling the width and letting height follow shows the whole
        // piece at true proportions.
        className="overflow-hidden rounded-xl border border-kc-border bg-white [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
        role="img"
        aria-label={alt}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }
  const src = imageUrl ?? fallbackImageUrl;
  if (!src) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-kc-border bg-kc-bg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="block h-auto w-full object-cover" loading="lazy" />
    </div>
  );
}

/**
 * The mobile summary.
 *
 * Collapsed it is one bar: the total and the CTA, which are the two things worth permanent screen
 * space on a phone. Expanded it slides the spec list up over the page.
 *
 * The spacer underneath is not decoration. Without it the fixed bar sits on top of the last section
 * of the form, and on the review step that is the terms checkbox - so the customer cannot tick the
 * box they are being blocked by.
 */
function MobileSummary(props: OrderSummaryPanelProps) {
  const [open, setOpen] = useState(false);
  const { total, loading, unavailableReason, ctaLabel, onCta, ctaDisabled, lines, productName } = props;

  return (
    <>
      <div aria-hidden className="h-24 lg:hidden" />
      <div data-testid="order-summary" className="fixed inset-x-0 bottom-0 z-40 border-t border-kc-border bg-white shadow-[0_-2px_20px_-8px_rgba(12,10,9,0.25)] lg:hidden">
        {open && (
          <div className="max-h-[50vh] overflow-y-auto border-b border-kc-border px-4 py-3">
            <h2 className="mb-2 text-[15px] font-bold text-kc-dark">{productName}</h2>
            <dl className="space-y-1.5">
              {lines.map((l) => (
                <div key={l.label} className="flex items-baseline justify-between gap-3 text-[13.5px]">
                  <dt className="shrink-0 text-kc-muted">{l.label}</dt>
                  <dd className="text-right font-medium text-kc-dark">{l.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span className="min-w-0">
              <span className="block text-[11.5px] font-semibold uppercase tracking-wide text-kc-muted">
                {open ? "Hide details" : "Order details"}
              </span>
              {unavailableReason ? (
                <span className="block truncate text-[13px] text-amber-700">{unavailableReason}</span>
              ) : (
                <span className="block font-mono text-[19px] font-black leading-tight text-kc-magenta-deep">
                  {loading || total === null ? "Pricing…" : formatDollars(total)}
                </span>
              )}
            </span>
            <ChevronUp
              className={cn("h-4 w-4 shrink-0 text-kc-muted transition-transform", open && "rotate-180")}
              aria-hidden="true"
            />
          </button>

          <Button
            onClick={onCta}
            disabled={ctaDisabled || loading}
            className="edge h-11 shrink-0 bg-kc-coral px-5 text-[15px] font-semibold text-white hover:bg-kc-magenta-deep disabled:bg-kc-coral/30 disabled:text-white disabled:opacity-100"
          >
            {ctaLabel}
          </Button>
        </div>
      </div>
    </>
  );
}
