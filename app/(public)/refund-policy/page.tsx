import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "KC Printing Refund Policy for design services.",
};

const SECTIONS: LegalSection[] = [
  {
    heading: "Full refund, before work begins",
    body: [
      "If you request a cancellation within 24 hours of placing your order and design work has not yet started, you are eligible for a full refund. Contact us at kansasdesigners@gmail.com or (816) 521-0462 to request cancellation.",
    ],
  },
  {
    heading: "Partial refund, after work begins",
    body: [
      "Once design work has started, refunds are issued on a prorated basis based on the amount of work completed. If a first draft has been delivered, a maximum of 50% of the order total may be refunded. If the design is in the revision stage, refunds are generally not available.",
    ],
  },
  {
    heading: "No refund situations",
    body: [
      "Refunds are not available after the final design files have been delivered and approved by the client, or after all included revisions have been used. Rush delivery fees are non-refundable once work has started.",
    ],
  },
  {
    heading: "How to request a refund",
    body: [
      "Email kansasdesigners@gmail.com with your order number and reason for the refund request. We will review and respond within 2 business days. Approved refunds are processed back to the original payment method within 5-10 business days.",
    ],
  },
  {
    heading: "Questions",
    body: [
      "If you have questions about our refund policy, contact us at kansasdesigners@gmail.com or (816) 521-0462.",
    ],
  },
];

export default function RefundPolicyPage() {
  return <LegalPage title="Refund Policy" updated="June 2025" sections={SECTIONS} />;
}
