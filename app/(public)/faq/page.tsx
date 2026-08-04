import type { Metadata } from "next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClosingCta } from "@/components/layout/ClosingCta";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about 611 Printing design services, file formats, turnaround times, revisions, and ordering.",
};

const FAQS = [
  {
    category: "Ordering",
    items: [
      { q: "How do I place an order?", a: "Select your service and package from the Services page, complete the product builder, upload any existing files or notes, and proceed to checkout. You will receive a confirmation email after payment." },
      { q: "Do I need to create an account?", a: "Yes. Creating a free account lets you track your order status, communicate with the design team, download your completed files, and request revisions. Sign up is quick and free." },
      { q: "Can I get a quote before ordering?", a: "Yes. Use the contact form or call (816) 521-0462 to request a custom quote. All standard packages have fixed published pricing with no hidden fees." },
      { q: "What payment methods do you accept?", a: "We accept all major credit and debit cards through Stripe. Payment is collected securely at checkout. Stripe is PCI-compliant and we never store your card information." },
    ],
  },
  {
    category: "Design Process",
    items: [
      { q: "How long does the design take?", a: "Standard turnaround is 2-4 business days for most projects. Rush delivery (24-48 hours) is available as an add-on." },
      { q: "How do revisions work?", a: "After you receive your first draft, you can submit revision requests through your account dashboard. Each package includes a set number of revisions (4-8 depending on tier). Additional revisions beyond your included count are available at a flat rate." },
      { q: "What if I am not happy with the design?", a: "We work with you until you are satisfied within the included revisions. If you are still not happy after all revisions are used, we offer additional revisions at a discounted rate for existing customers." },
      { q: "Do I need to provide any materials?", a: "Not required but helpful. You can upload your logo, brand colors, photos, or inspiration images. If starting from scratch, our AI brief tool helps capture your brand vision. The more context you provide, the better the first draft." },
    ],
  },
  {
    category: "Files and Formats",
    items: [
      { q: "What file formats are delivered?", a: "Business cards, postcards, and banners are delivered as a print-ready PDF with proper bleed, plus a high-resolution JPG and PNG." },
      { q: "Are files print-ready?", a: "Yes. All print files include proper bleed, are set to CMYK color mode, and are at the correct resolution (300-350 DPI for small formats, 72-150 DPI for large format). They are ready to upload directly to any commercial printer." },
      { q: "What file formats can I upload?", a: "We accept TIF, TIFF, EPS, AI, PSD, BMP, GIF, JPG, PNG, and PDF. Files should ideally be at 300 DPI or higher. Logos should be vector files (AI, EPS, or PDF) for best results." },
      { q: "How do I download my completed files?", a: "Completed files are available in your account dashboard under My Orders. You will also receive an email notification when your files are ready to download." },
    ],
  },
  {
    category: "Billing and Refunds",
    items: [
      { q: "What is your refund policy?", a: "If design work has not started, you can request a full refund within 24 hours of placing your order. Once work has begun, refunds are prorated based on completed work. See our full Refund Policy for details." },
      { q: "Are there any recurring charges?", a: "No. All services are one-time payments with no subscriptions or recurring charges." },
      { q: "Do you offer discounts for bulk orders?", a: "Yes. If you need multiple products or are a repeat customer, contact us for a custom quote. We offer bundled pricing for businesses ordering multiple services." },
      { q: "Can I use a coupon code?", a: "Yes. Enter your coupon code at checkout. Only one coupon can be applied per order." },
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      <PageHeader
        title="Frequently asked questions"
        lead="Everything you need to know about ordering, design, files, and billing."
      />

      <section className="band-tight bg-kc-paper">
        <div className="container-tight space-y-14">
          {FAQS.map((section) => (
            <div
              key={section.category}
              className="grid grid-cols-1 gap-6 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16"
            >
              <h2 className="display-tight text-2xl text-kc-dark sm:text-[1.9rem] lg:sticky lg:top-28 lg:self-start">
                {section.category}
              </h2>

              <Accordion className="border-t border-kc-dark/12">
                {section.items.map((item, i) => (
                  <AccordionItem
                    key={i}
                    value={`${section.category}-${i}`}
                    className="border-b border-kc-dark/12"
                  >
                    <AccordionTrigger className="py-5 text-left text-[16px] font-semibold text-kc-dark hover:text-kc-magenta-deep hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="max-w-[62ch] pb-5 text-[15px] leading-relaxed text-kc-dark/65">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </section>

      <ClosingCta
        title="Still have questions?"
        body="Call or text us and we'll get back to you quickly."
        primary={{ label: "Contact us", href: "/contact" }}
        secondary={{ label: "Browse products", href: "/services" }}
        showContactDetails
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.flatMap((s) =>
              s.items.map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: { "@type": "Answer", text: item.a },
              }))
            ),
          }),
        }}
      />
    </>
  );
}
