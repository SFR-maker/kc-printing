import type { LegalSection } from "@/components/layout/LegalPage";

/**
 * Bump whenever the substance changes, not for typo fixes.
 *
 * Acceptance is recorded against this version, so a customer who agreed to an older set can be
 * asked to re-accept rather than being silently held to terms they never saw.
 */
export const TERMS_VERSION = "2026-08-03";
export const TERMS_UPDATED_LABEL = "3 August 2026";

/**
 * KC Printing's Terms of Sale.
 *
 * Written against how this shop actually works: a browser design tool, an upload-and-approve proof,
 * banded print pricing, and flat-rate shipping. Clauses that only make sense for a much larger
 * printer - mailing services, freight, broker accounts - are deliberately absent, because terms
 * describing a business you do not run are worse than no terms at all.
 *
 * This is a plain-language starting point, not legal advice. Have a lawyer review it before
 * relying on it.
 */
export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: "Agreeing to these terms",
    body: [
      "By creating an account or placing an order with KC Printing, you agree to these Terms of Sale. If you do not agree to them, please do not place an order.",
      "We may change these terms from time to time. The version in force is the one shown on this page when you place your order, and we record which version you agreed to. If the terms change materially, we will ask you to accept the new version before your next order.",
      "You must be at least 18 years old to order from us.",
    ],
  },
  {
    heading: "Orders and acceptance",
    body: [
      "All orders are subject to acceptance by us. We may decline an order at our discretion, including after sending a confirmation email, in which case we refund you in full.",
      "We will not knowingly print material that infringes someone else's copyright or trademark, is unlawful, or is intended to deceive. You are responsible for holding the rights to everything you upload or ask us to reproduce.",
      "Prices, products and turnaround times shown on this site can change without notice, but a change never affects an order you have already paid for.",
    ],
  },
  {
    heading: "Proof approval is final",
    body: [
      "Before anything is printed, you approve a proof showing your artwork positioned on the print document, with the trim line and safe zone marked. Approving that proof is the point at which the design becomes final.",
      "Once you approve, we are not responsible for errors that were visible in the proof. That includes spelling, grammar, punctuation, wrong or missing content, the position of your artwork, and anything you placed outside the safe zone. We do not proofread your copy.",
      "Please do not approve a proof if anything needs changing. Replacing your file after approval means the order has to be reprocessed, which may incur a fee and will restart the turnaround.",
    ],
  },
  {
    heading: "Artwork you supply",
    body: [
      "Standard business cards print from a 3.6 by 2.1 inch document and trim to 3.5 by 2 inches. Cards with rounded corners need a 3.825 by 2.325 inch document, because a die has more positional play than a straight cut. Other products have their own sizes, shown on each product page.",
      "Extend backgrounds and any edge-to-edge image all the way to the document edge. Keep text, logos and anything else that must survive at least 0.125 inches inside the trim line.",
      "Supply artwork at 300 DPI or better, in CMYK. We accept PDF, PNG, JPG and TIFF. We cannot automatically check native Illustrator, Photoshop or InDesign files, so please export before uploading.",
      "If your file is a different size or shape to the document, our proof tool scales and positions it and shows you the result. What you approve is what we print.",
    ],
  },
  {
    heading: "Colour and print quality",
    body: [
      "Colours on your screen will not match printed ink exactly. Monitors emit light and vary by display, calibration and accessibility settings; print reflects it. We cannot guarantee a colour match to what you see on screen.",
      "Artwork supplied in RGB is converted to CMYK before printing, and some colours shift in that conversion, particularly bright blues and greens. Pantone colours are also converted and will be approximated.",
      "We use gang-run printing, where several customers' jobs share a press sheet. This is what keeps small runs affordable. It means slight variation between print runs of the same file is normal and is not a defect.",
      "If we make a mistake, we reprint it. Tell us within 6 business days of delivery and we will put it right.",
    ],
  },
  {
    heading: "Quantities",
    body: [
      "Print runs are not always exact. We aim to deliver at least the quantity you ordered and often include a few extra, but an industry-standard variance of up to 5% either way can occur on larger runs.",
      "If you receive substantially fewer than you ordered, more than 5% short, contact us and we will make it right.",
    ],
  },
  {
    heading: "Design services",
    body: [
      "Where you buy a design package, we build the layout for you from the brief and materials you provide. Each package includes a set number of revisions, shown on the pricing page. Additional revisions are available at a flat rate.",
      "First drafts are normally ready within 1 to 3 business days once we have everything we need from you. Delivery times are estimates, not guarantees.",
      "You own the final design files once your order is paid in full. We may show completed work in our portfolio unless you ask us in writing not to.",
    ],
  },
  {
    heading: "Payment",
    body: [
      "Payment is taken in full at checkout, through Stripe. We never see or store your card details.",
      "Sales tax is calculated from your delivery address and added at checkout, in states where we are registered to collect it.",
      "Nothing goes to print until payment has cleared.",
    ],
  },
  {
    heading: "Shipping and delivery",
    body: [
      "Shipping is charged at a flat rate per speed, chosen at checkout. Transit times are business days from despatch and do not include production time.",
      "All delivery dates are estimates provided by the carrier. We are not liable for delays in transit, including those caused by weather, carrier backlogs, or seasonal volume, and a late delivery is not grounds for a refund of the order.",
      "Risk passes to you when we hand the parcel to the carrier. We ship to the address you provide; if that address is wrong or incomplete, any reshipping cost is yours. We cannot ship to PO boxes.",
    ],
  },
  {
    heading: "Cancellations and refunds",
    body: [
      "You can cancel for a full refund any time before you approve your proof, provided design work has not started.",
      "Once a proof is approved and the job is in production, it cannot be cancelled, because the sheet is already committed to press.",
      "Our full refund terms, including partial refunds on design work already carried out, are set out in our Refund Policy.",
    ],
  },
  {
    heading: "Files we hold",
    body: [
      "Keep your own copy of anything you upload. We are not a file archive and cannot guarantee that uploaded artwork or generated proofs remain available after your order is complete.",
      "We may remove uploaded content at any time, and will remove it on request.",
    ],
  },
  {
    heading: "Limits on our liability",
    body: [
      "Our total liability for any order is limited to what you paid for that order. We are not liable for indirect or consequential losses, including missed events, lost business, or the cost of reprinting elsewhere.",
      "Nothing in these terms limits liability that cannot lawfully be limited.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "Questions about these terms: kansasdesigners@gmail.com or (816) 521-0462.",
      "KC Printing is based in Kansas City, Missouri and serves customers across the United States.",
    ],
  },
];
