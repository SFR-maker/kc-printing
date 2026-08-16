import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { OrderStatus } from "./order-status";

export const metadata: Metadata = { title: "Order Confirmed" };

/**
 * The page after checkout.
 *
 * It used to call stripe.checkout.sessions.retrieve during the server render, which held the whole
 * response open until Stripe answered - so the customer saw nothing at all on the one page where
 * they most need immediate reassurance that the money they just spent went somewhere sensible. It
 * also made this route dynamic, and dependent on a third party being reachable in order to render
 * any HTML whatsoever.
 *
 * The shell is static now and OrderStatus confirms the payment from the browser. The Suspense
 * boundary is required rather than decorative: OrderStatus reads searchParams via useSearchParams,
 * and without a boundary that would opt this route back into dynamic rendering, undoing the change.
 */
export default function SuccessPage() {
  return (
    <Suspense fallback={<Waiting />}>
      <OrderStatus />
    </Suspense>
  );
}

/** Matches OrderStatus's own checking state, so hydration does not visibly swap one for the other. */
function Waiting() {
  return (
    <div className="section-pad container-tight max-w-xl text-center">
      <Loader2 className="mx-auto mb-6 h-16 w-16 animate-spin text-kc-teal" aria-hidden="true" />
      <h1 className="mb-3 text-3xl font-black text-kc-dark">Confirming your payment</h1>
      <p className="text-lg leading-relaxed text-kc-muted">
        One moment - we&apos;re checking with our payment provider.
      </p>
    </div>
  );
}
