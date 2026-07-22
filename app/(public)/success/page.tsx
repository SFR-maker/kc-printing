import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stripe } from "@/lib/stripe";

export const metadata: Metadata = { title: "Order Confirmed" };

type VerifyResult = "paid" | "unpaid" | "unverifiable" | "missing";

async function verifySession(sessionId: string | undefined): Promise<VerifyResult> {
  if (!sessionId) return "missing";
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session.payment_status === "paid" ? "paid" : "unpaid";
  } catch (err) {
    // Covers STRIPE_SECRET_KEY not being configured yet, an invalid/expired session id, or a
    // transient Stripe API error — none of these should be presented to the customer as "your
    // payment failed," since we genuinely don't know either way.
    console.error("Failed to verify checkout session:", err);
    return "unverifiable";
  }
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const result = await verifySession(session_id);

  if (result === "paid") {
    return (
      <div className="section-pad container-tight max-w-xl text-center">
        <CheckCircle2 className="h-16 w-16 text-kc-teal mx-auto mb-6" />
        <h1 className="text-3xl font-black text-kc-dark mb-3">Order Confirmed</h1>
        <p className="text-kc-muted text-lg mb-4 leading-relaxed">
          Your order has been received and payment was processed successfully. Our design team will begin work shortly.
        </p>
        <p className="text-kc-muted text-sm mb-8">
          You will receive a confirmation email and can track your order status in your account dashboard.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Button asChild className="bg-kc-teal hover:bg-kc-teal/90 text-white">
            <Link href="/account/orders">View My Orders</Link>
          </Button>
          <Button asChild variant="outline" className="border-kc-teal text-kc-teal hover:bg-kc-teal/5">
            <Link href="/services">Order Another Service</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (result === "unpaid") {
    return (
      <div className="section-pad container-tight max-w-xl text-center">
        <XCircle className="h-16 w-16 text-kc-muted mx-auto mb-6" />
        <h1 className="text-3xl font-black text-kc-dark mb-3">Payment Not Completed</h1>
        <p className="text-kc-muted text-lg mb-8 leading-relaxed">
          We couldn&apos;t confirm payment for this order. If you were charged, contact us and we&apos;ll sort it out right away — otherwise, you can return and try again.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Button asChild className="bg-kc-coral hover:bg-kc-coral/90 text-white">
            <Link href="/services">Return to Services</Link>
          </Button>
          <Button asChild variant="outline" className="border-kc-teal text-kc-teal hover:bg-kc-teal/5">
            <Link href="/contact">Get Help</Link>
          </Button>
        </div>
      </div>
    );
  }

  // "missing" (no session_id at all — someone navigated here directly) and "unverifiable"
  // (Stripe not reachable/configured) both get the same honest, non-committal state: we don't
  // pretend an order was placed when we can't confirm one was.
  return (
    <div className="section-pad container-tight max-w-xl text-center">
      <HelpCircle className="h-16 w-16 text-kc-muted mx-auto mb-6" />
      <h1 className="text-3xl font-black text-kc-dark mb-3">No Order Found</h1>
      <p className="text-kc-muted text-lg mb-8 leading-relaxed">
        We couldn&apos;t find an order to confirm here. If you just completed checkout, check your email for a confirmation, or view your orders below. If something seems wrong, contact us.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Button asChild className="bg-kc-teal hover:bg-kc-teal/90 text-white">
          <Link href="/account/orders">View My Orders</Link>
        </Button>
        <Button asChild variant="outline" className="border-kc-teal text-kc-teal hover:bg-kc-teal/5">
          <Link href="/contact">Contact Us</Link>
        </Button>
      </div>
    </div>
  );
}
