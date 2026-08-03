import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "KC Printing Privacy Policy explaining how we collect, use, and protect your personal information.",
};

const SECTIONS: LegalSection[] = [
  {
    heading: "Information we collect",
    body: [
      "We collect information you provide when creating an account (name, email, password), placing orders (contact info, project details), uploading files, and communicating with our team. We also collect standard server logs and usage analytics.",
    ],
  },
  {
    heading: "How we use your information",
    body: [
      "We use your information to provide and improve our design services, process payments, communicate about your orders, and send service-related updates. We do not sell your personal information to third parties.",
    ],
  },
  {
    heading: "Data storage and security",
    body: [
      "Your data is stored securely using industry-standard encryption. Payment information is processed by Stripe and never stored on our servers. Files you upload are stored securely and accessible only to you and our design team.",
    ],
  },
  {
    heading: "Third-party services",
    body: [
      "We use Clerk for authentication, Stripe for payment processing, UploadThing for file storage, and Resend for transactional email. Each of these services has its own privacy policy.",
    ],
  },
  {
    heading: "Your rights",
    body: [
      "You may request access to, correction of, or deletion of your personal data by contacting us at kansasdesigners@gmail.com. We will respond within 30 days.",
    ],
  },
  {
    heading: "Contact",
    body: ["Privacy questions should be directed to kansasdesigners@gmail.com or (816) 521-0462."],
  },
];

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" updated="June 2025" sections={SECTIONS} />;
}
