"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, HelpCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listPendingOrders, forgetPendingOrder } from "@/lib/cart/pending";
import type { VerifyResult } from "@/app/api/checkout-session/route";

/**
 * Confirms the payment, after the page has already appeared.
 *
 * The verification used to happen during the server render, which meant the customer stared at
 * nothing until Stripe replied - on the one page where they most want immediate reassurance that
 * their money went somewhere sensible. The shell now renders instantly and this fills in.
 *
 * The three outcomes are deliberately distinct and none of them collapse into each other:
 *   paid          - confirmed by Stripe.
 *   unpaid        - Stripe says the session was not paid.
 *   unverifiable  - we could not ask. Never shown as failure; someone who has just been charged
 *   / missing       must not be told their payment failed because our API call timed out.
 */
export function OrderStatus() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [verified, setVerified] = useState<VerifyResult | null>(null);

  /*
   * "missing" is derived, not stored. Landing here without a session id is knowable from the URL
   * alone, so setting it from an effect would mean rendering the spinner for a frame and then
   * cascading a second render to say something we knew before the first one.
   */
  const result: VerifyResult | null = sessionId ? verified : "missing";

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    fetch(`/api/checkout-session?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => (r.ok ? r.json() : { result: "unverifiable" }))
      .then((d) => { if (!cancelled) setVerified((d?.result as VerifyResult) ?? "unverifiable"); })
      // A failed fetch is the same state as a failed Stripe call: unknown, not unpaid.
      .catch(() => { if (!cancelled) setVerified("unverifiable"); });
    return () => { cancelled = true; };
  }, [sessionId]);

  /*
   * A confirmed payment clears the cart reminder.
   *
   * The Stripe webhook marks the order PAID server-side, but nothing tells this browser - so
   * without this the customer would land on "Order Confirmed" with a cart still insisting they owe
   * money for it. The session id is not the order id, so every outstanding local record is cleared
   * on a confirmed payment; /api/orders/pending re-adds anything genuinely still unpaid.
   */
  useEffect(() => {
    if (result !== "paid") return;
    for (const o of listPendingOrders()) forgetPendingOrder(o.orderId);
  }, [result]);

  if (result === null) return <Checking />;
  if (result === "paid") return <Paid />;
  if (result === "unpaid") return <Unpaid />;
  return <Unknown />;
}

/**
 * The waiting state.
 *
 * Says "confirming your payment" rather than nothing, because the honest reading of a blank space
 * here is that something has gone wrong with an order the customer has already paid for.
 */
function Checking() {
  return (
    <div className="section-pad container-tight max-w-xl text-center">
      <Loader2 className="mx-auto mb-6 h-16 w-16 animate-spin text-kc-teal" aria-hidden="true" />
      <h1 className="mb-3 text-3xl font-black text-kc-dark">Confirming your payment</h1>
      <p className="text-lg leading-relaxed text-kc-muted" role="status" aria-live="polite">
        One moment - we&apos;re checking with our payment provider.
      </p>
    </div>
  );
}

function Paid() {
  return (
    <div className="section-pad container-tight max-w-xl text-center">
      <CheckCircle2 className="mx-auto mb-6 h-16 w-16 text-kc-teal" />
      <h1 className="mb-3 text-3xl font-black text-kc-dark">Order Confirmed</h1>
      <p className="mb-4 text-lg leading-relaxed text-kc-muted">
        Your order has been received and payment was processed successfully. Our design team will begin work shortly.
      </p>
      <p className="mb-8 text-sm text-kc-muted">
        You will receive a confirmation email and can track your order status in your account dashboard.
      </p>
      <Actions primary={{ href: "/account/orders", label: "View My Orders" }} secondary={{ href: "/services", label: "Order Another Service" }} />
    </div>
  );
}

function Unpaid() {
  return (
    <div className="section-pad container-tight max-w-xl text-center">
      <XCircle className="mx-auto mb-6 h-16 w-16 text-kc-muted" />
      <h1 className="mb-3 text-3xl font-black text-kc-dark">Payment Not Completed</h1>
      <p className="mb-8 text-lg leading-relaxed text-kc-muted">
        We couldn&apos;t confirm payment for this order. If you were charged, contact us and we&apos;ll sort it out right away. Otherwise, you can return and try again.
      </p>
      <Actions
        primary={{ href: "/services", label: "Return to Services", tone: "coral" }}
        secondary={{ href: "/contact", label: "Get Help" }}
      />
    </div>
  );
}

/** "missing" and "unverifiable" share this: we will not claim an order we cannot confirm. */
function Unknown() {
  return (
    <div className="section-pad container-tight max-w-xl text-center">
      <HelpCircle className="mx-auto mb-6 h-16 w-16 text-kc-muted" />
      <h1 className="mb-3 text-3xl font-black text-kc-dark">No Order Found</h1>
      <p className="mb-8 text-lg leading-relaxed text-kc-muted">
        We couldn&apos;t find an order to confirm here. If you just completed checkout, check your email for a confirmation, or view your orders below. If something seems wrong, contact us.
      </p>
      <Actions primary={{ href: "/account/orders", label: "View My Orders" }} secondary={{ href: "/contact", label: "Contact Us" }} />
    </div>
  );
}

function Actions({
  primary,
  secondary,
}: {
  primary: { href: string; label: string; tone?: "teal" | "coral" };
  secondary: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col justify-center gap-3 sm:flex-row">
      <Button
        asChild
        className={primary.tone === "coral" ? "bg-kc-coral text-white hover:bg-kc-coral/90" : "bg-kc-teal text-white hover:bg-kc-teal/90"}
      >
        <Link href={primary.href}>{primary.label}</Link>
      </Button>
      <Button asChild variant="outline" className="border-kc-teal text-kc-teal hover:bg-kc-teal/5">
        <Link href={secondary.href}>{secondary.label}</Link>
      </Button>
    </div>
  );
}
