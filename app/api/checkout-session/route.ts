import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

/**
 * Whether a checkout session was actually paid.
 *
 * Split out of the /success page so that page can render its shell immediately instead of holding
 * the whole response open while Stripe answers. It is the highest-intent moment in the funnel - the
 * customer has just paid - and it was the one page that blocked on a third-party API before showing
 * a single pixel.
 *
 * Returns only a status word. A checkout session carries the customer's email, address, line items
 * and payment details, and none of that needs to cross back to the browser to draw a tick.
 *
 * Unauthenticated, like the page it serves: the session id is the capability, it is single-use and
 * unguessable, and the customer arriving from Stripe has no session with us yet. Nothing here is
 * disclosed that the holder of the id could not already see on their own receipt.
 */
export const dynamic = "force-dynamic";

export type VerifyResult = "paid" | "unpaid" | "unverifiable" | "missing";

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ result: "missing" satisfies VerifyResult });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const result: VerifyResult = session.payment_status === "paid" ? "paid" : "unpaid";
    return NextResponse.json({ result });
  } catch (err) {
    /*
     * Covers STRIPE_SECRET_KEY not being configured, an invalid or expired session id, and a
     * transient Stripe outage. None of those may be shown to the customer as "your payment failed":
     * we genuinely do not know, and telling someone who just paid that they did not is worse than
     * admitting uncertainty.
     */
    console.error("Failed to verify checkout session:", err);
    return NextResponse.json({ result: "unverifiable" satisfies VerifyResult });
  }
}
