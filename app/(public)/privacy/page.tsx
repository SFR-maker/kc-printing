import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "KC Printing Privacy Policy explaining how we collect, use, and protect your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="section-pad container-tight max-w-3xl">
      <h1 className="text-3xl font-black text-kc-dark mb-2">Privacy Policy</h1>
      <p className="text-kc-muted text-sm mb-8">Last updated: June 2025</p>
      <div className="prose prose-sm max-w-none text-kc-muted space-y-6">
        <section>
          <h2 className="text-lg font-bold text-kc-dark mb-2">1. Information We Collect</h2>
          <p>We collect information you provide when creating an account (name, email, password), placing orders (contact info, project details), uploading files, and communicating with our team. We also collect standard server logs and usage analytics.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-kc-dark mb-2">2. How We Use Your Information</h2>
          <p>We use your information to provide and improve our design services, process payments, communicate about your orders, and send service-related updates. We do not sell your personal information to third parties.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-kc-dark mb-2">3. Data Storage and Security</h2>
          <p>Your data is stored securely using industry-standard encryption. Payment information is processed by Stripe and never stored on our servers. Files you upload are stored securely and accessible only to you and our design team.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-kc-dark mb-2">4. Third-Party Services</h2>
          <p>We use Clerk for authentication, Stripe for payment processing, UploadThing for file storage, and Resend for transactional email. Each of these services has its own privacy policy.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-kc-dark mb-2">5. Your Rights</h2>
          <p>You may request access to, correction of, or deletion of your personal data by contacting us at kansasdesigners@gmail.com. We will respond within 30 days.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-kc-dark mb-2">6. Contact</h2>
          <p>Privacy questions should be directed to kansasdesigners@gmail.com or (816) 521-0462.</p>
        </section>
      </div>
    </div>
  );
}
