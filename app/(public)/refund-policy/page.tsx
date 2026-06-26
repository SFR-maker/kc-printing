import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "KC Printing Refund Policy for design services.",
};

export default function RefundPolicyPage() {
  return (
    <div className="section-pad container-tight max-w-3xl">
      <h1 className="text-3xl font-black text-kc-dark mb-2">Refund Policy</h1>
      <p className="text-kc-muted text-sm mb-8">Last updated: June 2025</p>
      <div className="prose prose-sm max-w-none text-kc-muted space-y-6">
        <section>
          <h2 className="text-lg font-bold text-kc-dark mb-2">Full Refund (Before Work Begins)</h2>
          <p>If you request a cancellation within 24 hours of placing your order and design work has not yet started, you are eligible for a full refund. Contact us at kansasdesigners@gmail.com or (816) 521-0462 to request cancellation.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-kc-dark mb-2">Partial Refund (After Work Begins)</h2>
          <p>Once design work has started, refunds are issued on a prorated basis based on the amount of work completed. If a first draft has been delivered, a maximum of 50% of the order total may be refunded. If the design is in the revision stage, refunds are generally not available.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-kc-dark mb-2">No Refund Situations</h2>
          <p>Refunds are not available after the final design files have been delivered and approved by the client, or after all included revisions have been used. Rush delivery fees are non-refundable once work has started.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-kc-dark mb-2">How to Request a Refund</h2>
          <p>Email kansasdesigners@gmail.com with your order number and reason for the refund request. We will review and respond within 2 business days. Approved refunds are processed back to the original payment method within 5-10 business days.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-kc-dark mb-2">Questions</h2>
          <p>If you have questions about our refund policy, contact us at kansasdesigners@gmail.com or (816) 521-0462.</p>
        </section>
      </div>
    </div>
  );
}
