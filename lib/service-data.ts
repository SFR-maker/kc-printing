export interface PackageTierDef {
  name: string;
  price: number;
  features: string[];
  popular?: boolean;
}

export interface ServiceFAQ {
  q: string;
  a: string;
}

export interface ServiceDef {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  specs: { label: string; value: string }[];
  packages: PackageTierDef[];
  addOns: { name: string; price: number; desc: string }[];
  faqs: ServiceFAQ[];
}

export const SERVICES: Record<string, ServiceDef> = {
  "business-cards": {
    slug: "business-cards",
    name: "Business Cards",
    tagline: "First impressions that last. Professional cards designed and delivered fast.",
    description:
      "Custom business card design in standard and specialty shapes. We deliver print-ready files at 300-350 DPI with proper 0.1 in bleed, ready for any commercial printer.",
    icon: "🪪",
    specs: [
      { label: "Standard Size", value: "2 in x 3.5 in" },
      { label: "Special Shapes", value: "Square, Circle, Oval, Slim, Leaf" },
      { label: "Paper Options", value: "14pt Gloss, 14pt Uncoated, 16pt Matte, 32pt Ultra-Thick" },
      { label: "Bleed", value: "0.1 in on all sides" },
      { label: "Upload Formats", value: "TIF, TIFF, EPS, AI, PSD, BMP, GIF, JPG, PNG, PDF" },
      { label: "Resolution", value: "300 to 350 DPI recommended" },
      { label: "Delivery", value: "Print-ready PDF, JPG, PNG" },
    ],
    packages: [
      { name: "Silver", price: 39, features: ["1-2 images or logos", "Basic copy included", "Up to 4 revisions", "Print-ready PDF and JPG", "3-5 business day delivery"] },
      { name: "Gold", price: 49, popular: true, features: ["3-4 images or logos", "Basic copy included", "Up to 6 revisions", "PDF, JPG, and PNG delivery", "2-3 business day delivery", "Two layout concepts"] },
      { name: "Platinum", price: 69, features: ["5 or more images or logos", "Comprehensive copy", "Up to 8 revisions", "Full file bundle", "Priority 1-2 business day delivery", "Three layout concepts", "Front and back design included"] },
    ],
    addOns: [
      { name: "Back Side Design", price: 29, desc: "Full design for the back of your card" },
      { name: "Rush Delivery", price: 49, desc: "Guaranteed completion within 24 hours" },
      { name: "QR Code", price: 15, desc: "Custom QR code linking to your website or social" },
      { name: "Extra Concept", price: 25, desc: "One additional layout concept to choose from" },
    ],
    faqs: [
      { q: "What size should my business card be?", a: "The standard size is 2 in x 3.5 in. We also offer square (2.5 x 2.5), slim (1.75 x 3.5), circle (2.5 in diameter), and leaf shapes. Specialty shapes may vary by printer." },
      { q: "What paper stock do you recommend?", a: "14pt gloss is the most popular choice for vibrant colors. 16pt matte is excellent for a premium feel and easy to write on. Ultra-thick 32pt stock makes a strong impression at networking events." },
      { q: "Do I need to provide any files?", a: "Not required. You can upload your existing logo, brand colors, and inspiration images. If starting fresh, our AI brief tool will help capture your brand vision before the designer begins." },
      { q: "How does the bleed work?", a: "We add 0.1 in of bleed on all sides to your design. This ensures that when the card is cut, there are no white edges from printing variance. Your important content stays within the safe zone." },
      { q: "Can I print the file myself or send to my own printer?", a: "Yes. You receive the final print-ready files and can use any commercial printer. We follow industry standard specifications for bleed, resolution, and color mode." },
      { q: "How many revisions are included?", a: "Silver includes up to 4 revisions, Gold up to 6, and Platinum up to 8. Additional revisions beyond your included count are available at a flat rate." },
    ],
  },
  "postcards": {
    slug: "postcards",
    name: "Postcards",
    tagline: "High-impact postcard designs for marketing campaigns, EDDM mailers, and direct mail.",
    description:
      "Eye-catching postcard designs in multiple sizes. Perfect for EDDM campaigns, client outreach, event promotions, and seasonal marketing. Front and back design available.",
    icon: "📬",
    specs: [
      { label: "Popular Sizes", value: "3x5, 4x6, 5x7, 5.5x8.5, 6x9, 6x11 in" },
      { label: "Custom Sizes", value: "2x4 in up to 9x12 in" },
      { label: "Paper Options", value: "14pt Gloss, 16pt Matte, Smooth White, Pearl, Ultra-Thick" },
      { label: "Features", value: "Front-only or front-back, rounded corners, EDDM-ready" },
      { label: "EDDM", value: "Every Door Direct Mail address panel and postage zone" },
      { label: "Bleed", value: "0.125 in on all sides" },
      { label: "Delivery", value: "Print-ready PDF, JPG, PNG" },
    ],
    packages: [
      { name: "Silver", price: 49, features: ["1-2 images or logos", "Basic copy included", "Up to 4 revisions", "Front side design", "Print-ready files"] },
      { name: "Gold", price: 69, popular: true, features: ["3-4 images or logos", "Basic copy included", "Up to 6 revisions", "Front and back design", "EDDM address panel option", "Two layout concepts"] },
      { name: "Platinum", price: 89, features: ["5 or more images or logos", "Comprehensive copy", "Up to 8 revisions", "Front and back design", "EDDM-ready layout", "Mailing campaign layout", "Full file bundle"] },
    ],
    addOns: [
      { name: "EDDM Panel", price: 20, desc: "Every Door Direct Mail address area and postage zone" },
      { name: "Rounded Corners", price: 15, desc: "Rounded corner specification for premium feel" },
      { name: "Rush Delivery", price: 49, desc: "Guaranteed completion within 24 hours" },
      { name: "Mailing List Layout", price: 35, desc: "Address block layout formatted for mailing list merge" },
    ],
    faqs: [
      { q: "What is EDDM and do I need it?", a: "Every Door Direct Mail is a USPS program that lets you mail to entire carrier routes without a mailing list. If you plan to use EDDM, choose a size that meets USPS requirements (at least 3.5 x 5 in) and add the EDDM address panel add-on." },
      { q: "What is the most popular postcard size?", a: "The 4 x 6 in and 6 x 9 in sizes are the most popular. Larger sizes like 6 x 9 or 6 x 11 tend to have higher open rates and stand out in a mailbox." },
      { q: "Can I get front and back design?", a: "Yes. The Gold and Platinum packages include front and back design. The Silver package covers the front only. Back design is focused on reply info, mailing panel, or additional marketing content." },
      { q: "What file formats are delivered?", a: "You receive a print-ready PDF with proper bleed, a high-resolution JPG, and a PNG. Files are print-ready for any commercial or online printer." },
      { q: "How long does the design take?", a: "Standard turnaround is 2-4 business days. Rush delivery (24-hour) is available as an add-on for an additional fee." },
      { q: "Can you design a postcard for any custom size?", a: "Yes. We support custom sizes from 2 x 4 in up to 9 x 12 in. Specify your size in the order notes and we will match it precisely." },
    ],
  },
  "banners": {
    slug: "banners",
    name: "Banners",
    tagline: "Professional banner designs for trade shows, storefronts, and outdoor promotions. Print-ready, to spec, and delivered fast.",
    description:
      "Custom banner designs for retractable roll-up stands and large format vinyl banners. Files include proper bleed, safe zone, and grommet placement guides for professional printing.",
    icon: "🎯",
    specs: [
      { label: "Banner Type", value: "Roll-Up Stand or Vinyl Banner" },
      { label: "Roll-Up Sizes", value: "24x81, 33x81, 36x81 in, Table-Top 24x63 in" },
      { label: "Vinyl Sizes", value: "2x4 ft up to 4x10 ft, custom sizes up to 6x20 ft" },
      { label: "Vinyl Materials", value: "8oz Mesh, 13oz Scrim Gloss, 13oz Scrim Matte" },
      { label: "Bleed", value: "0.125 in on all sides" },
      { label: "Safe Zone", value: "0.5 in from all edges (roll-up stands)" },
      { label: "Grommets", value: "Placement spec included (vinyl banners)" },
      { label: "Delivery", value: "Print-ready PDF with guides, high-res JPG" },
    ],
    packages: [
      { name: "Silver", price: 79, features: ["1-2 images or logos", "Basic copy", "Up to 4 revisions", "Print-ready PDF with bleed", "Safe zone or grommet guidelines"] },
      { name: "Gold", price: 139, popular: true, features: ["3-4 images or logos", "Basic copy", "Up to 6 revisions", "Print-ready PDF with bleed", "Two layout concepts"] },
      { name: "Platinum", price: 199, features: ["5 or more images or logos", "Comprehensive copy", "Up to 8 revisions", "Full file bundle", "Three layout concepts", "Priority delivery"] },
    ],
    addOns: [
      { name: "Rush Delivery", price: 79, desc: "Completed within 24 hours" },
      { name: "Extra Concept", price: 49, desc: "One additional layout concept" },
      { name: "Matching Business Card", price: 39, desc: "Business card design that matches your banner" },
      { name: "Grommet Spec Sheet", price: 15, desc: "Print-ready grommet placement diagram (vinyl banners)" },
      { name: "Double Sided Design", price: 79, desc: "Full design for both sides (vinyl banners)" },
    ],
    faqs: [
      { q: "Should I choose a roll-up stand or a vinyl banner?", a: "Roll-up stands are ideal for indoor trade shows, storefronts, and offices where you need something reusable and easy to set up. Vinyl banners are better for outdoor events, storefronts, and large-format displays that get hung or mounted. Let us know your use case and we will recommend the right format." },
      { q: "What is the most common banner size?", a: "For roll-up stands, 33 x 81 in is the industry standard for trade shows. For vinyl banners, 3x8 or 4x8 ft are common for storefronts and events. We also offer table-top and custom sizes." },
      { q: "What bleed and safe zone do I need?", a: "We design with 0.125 in bleed on all sides. Roll-up stands keep important content at least 0.5 in from the edges to account for the retractable base. Vinyl banners include grommet placement guides on request." },
      { q: "What file format does the printer need?", a: "Most printers accept high-resolution PDF or JPG files. We deliver both, with crop marks and bleed guides included for professional printing services." },
      { q: "Can I use my existing brand colors and logo?", a: "Yes. Upload your existing logo and brand guidelines in the order. If you do not have a style guide, fill out the brand questionnaire and our designer will match your colors as closely as possible." },
      { q: "Can I order a custom vinyl banner size?", a: "Yes. We support custom vinyl banner sizes from 1x2 ft up to 6x20 ft. Specify your dimensions in the order notes and we will match it precisely." },
    ],
  },
};
