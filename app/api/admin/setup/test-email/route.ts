import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { sendStatusUpdate } from "@/lib/resend";

/**
 * Sends one real email to the signed-in admin.
 *
 * "Is email working?" cannot be answered by checking that an API key exists - the key can be valid
 * while the sending domain is unverified, the sender address wrong, or the whole thing landing in
 * spam. The only honest test is a message that actually arrives, so this sends one through exactly
 * the same code path a customer's shipping notice uses.
 */
export async function POST() {
  const { error, user } = await requireAdmin();
  if (error) return error;

  const sent = await sendStatusUpdate({
    customerName: user!.name ?? "there",
    customerEmail: user!.email,
    orderId: "test0000",
    heading: "Test email from your shop",
    message:
      "this is a test from the setup page. If it reached your inbox and not your spam folder, "
      + "order confirmations, shipping notices and refund emails will too.",
  });

  return sent
    ? NextResponse.json({ sent: true, to: user!.email })
    : NextResponse.json(
        {
          sent: false,
          error:
            "Resend refused it. The usual causes are an unverified sending domain or a sender "
            + "address that is not on it. The exact reason is in the Vercel function logs.",
        },
        { status: 502 }
      );
}
