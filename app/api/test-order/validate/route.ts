import { NextResponse } from "next/server";
import { isTestOrderCode } from "@/lib/pricing/test-order";

/**
 * Whether a test-order code is real, for the configurator's benefit only.
 *
 * The product pages used to validate this during server rendering, which is what forced them to be
 * dynamically rendered on every request - for a parameter no customer ever sends. Moving the read
 * into the browser lets those pages be prerendered, and this route answers the one question the
 * client cannot answer for itself.
 *
 * It decides *display* only: whether the configurator shows the run as free. Nothing here can make
 * an order free. /api/orders re-checks the code itself before zeroing anything and rejects an
 * invalid one outright, so a client that lied to itself would simply be refused at checkout.
 *
 * Not a new oracle, either. `/services/business-cards?test=X` already showed a $0 price for a valid
 * code and a real one otherwise, so the same signal was public before this route existed. The code
 * is at least 16 characters and compared in constant time; it is not brute-forceable through either.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code");
  // Deliberately returns only a boolean - never the expected value, and never a reason.
  return NextResponse.json(
    { valid: isTestOrderCode(code) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
