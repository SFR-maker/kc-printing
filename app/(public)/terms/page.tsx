import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "KC Printing Terms of Service governing the use of our design and print services.",
};

export default function TermsPage() {
  return (
    <div className="section-pad container-tight max-w-3xl">
      <h1 className="text-3xl font-black text-kc-dark mb-2">Terms of Service</h1>
      <p className="text-kc-muted text-sm mb-8">Last updated: June 2025</p>
      <div className="prose prose-sm max-w-none text-kc-muted space-y-6">
        <section>
          <h2 className="text-lg font-bold text-kc-dark mb-2">1. Services</h2>
          <p>KC Printing provides online design services including business cards, postcards, banners, logo design, and website design. All services are provided on a project basis with pricing as published on our website or as agreed in a custom quote.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-kc-dark mb-2">2. Payment</h2>
          <p>Payment is due in full at the time of order. We accept all major credit and debit cards through Stripe. All prices are in USD. Prices are subject to change without notice, but changes will not affect orders already placed.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-kc-dark mb-2">3. Revisions</h2>
          <p>Each package includes a set number of revisions as specified in the package description. Revision requests must be submitted through your account dashboard. Additional revisions beyond the included count are available at a flat rate per revision.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-kc-dark mb-2">4. Intellectual Property</h2>
          <p>Upon final payment and project completion, full ownership of the final design files is transferred to you. KC Printing retains the right to display the work in our portfolio unless you request otherwise in writing.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-kc-dark mb-2">5. Client Responsibilities</h2>
          <p>You are responsible for providing accurate content, ensuring you have the right to use any images or content submitted, and reviewing proofs carefully before approving. KC Printing is not liable for errors approved by the client.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-kc-dark mb-2">6. Limitation of Liability</h2>
          <p>KC Printing is not liable for indirect, incidental, or consequential damages. Our total liability for any claim is limited to the amount paid for the specific service giving rise to the claim.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-kc-dark mb-2">7. Contact</h2>
          <p>Questions about these terms should be directed to kansasdesigners@gmail.com or (816) 521-0462.</p>
        </section>
      </div>
    </div>
  );
}
