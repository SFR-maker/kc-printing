import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "KC Printing Terms of Service governing the use of our design and print services.",
};

const SECTIONS: LegalSection[] = [
  {
    heading: "Services",
    body: [
      "KC Printing provides online design services including business cards, postcards, banners, and rigid signs. All services are provided on a project basis with pricing as published on our website or as agreed in a custom quote.",
    ],
  },
  {
    heading: "Payment",
    body: [
      "Payment is due in full at the time of order. We accept all major credit and debit cards through Stripe. All prices are in USD. Prices are subject to change without notice, but changes will not affect orders already placed.",
    ],
  },
  {
    heading: "Revisions",
    body: [
      "Each package includes a set number of revisions as specified in the package description. Revision requests must be submitted through your account dashboard. Additional revisions beyond the included count are available at a flat rate per revision.",
    ],
  },
  {
    heading: "Intellectual property",
    body: [
      "Upon final payment and project completion, full ownership of the final design files is transferred to you. KC Printing retains the right to display the work in our portfolio unless you request otherwise in writing.",
    ],
  },
  {
    heading: "Client responsibilities",
    body: [
      "You are responsible for providing accurate content, ensuring you have the right to use any images or content submitted, and reviewing proofs carefully before approving. KC Printing is not liable for errors approved by the client.",
    ],
  },
  {
    heading: "Limitation of liability",
    body: [
      "KC Printing is not liable for indirect, incidental, or consequential damages. Our total liability for any claim is limited to the amount paid for the specific service giving rise to the claim.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "Questions about these terms should be directed to kansasdesigners@gmail.com or (816) 521-0462.",
    ],
  },
];

export default function TermsPage() {
  return <LegalPage title="Terms of Service" updated="June 2025" sections={SECTIONS} />;
}
