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
      "Custom business card design in standard and specialty shapes. We deliver print-ready files at 300-350 DPI with proper 0.05 in bleed, ready for any commercial printer.",
    icon: "🪪",
    specs: [
      { label: "Standard Size", value: "2 in x 3.5 in" },
      { label: "Sizes", value: '2" x 3.5" US Standard, 2" x 3", 1.75" x 3", 1.75" x 3.5", each horizontal or vertical' },
      { label: "Paper Options", value: "12 stocks, from 100 lb. Matte Cover to 38 pt. Trifecta with a velvet finish" },
      { label: "Bleed", value: "0.05 in on all sides" },
      { label: "Upload Formats", value: "PDF, PNG, JPG, TIF, TIFF" },
      { label: "Resolution", value: "300 to 350 DPI recommended" },
      { label: "Delivery", value: "Print-ready PDF and PNG" },
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
      { q: "How does the bleed work?", a: "We add 0.05 in of bleed on all sides to your design. This ensures that when the card is cut, there are no white edges from printing variance. Your important content stays within the safe zone." },
      { q: "Can I print the file myself or send to my own printer?", a: "Yes. You receive the final print-ready files and can use any commercial printer. Files are supplied at the full bleed size in RGB; if your printer needs CMYK separations, tell us and we will supply them." },
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
      "Custom designs for large-format vinyl and wind-through mesh banners, hemmed on all four sides and finished with grommets. Files include proper bleed, safe zone, and grommet placement guides for professional printing.",
    icon: "🎯",
    specs: [
      { label: "Banner Type", value: "Hemmed vinyl or wind-through mesh" },
      { label: "Materials", value: "13 oz. scrim vinyl (glossy or matte), 8 oz. mesh" },
      { label: "Vinyl Sizes", value: "2x4 ft up to 4x10 ft, custom sizes up to 6x20 ft" },
      { label: "Vinyl Materials", value: "8oz Mesh, 13oz Scrim Gloss, 13oz Scrim Matte" },
      { label: "Bleed", value: "0.125 in on all sides" },
      { label: "Safe Zone", value: "0.5 in from the trim" },
      { label: "Finishing", value: "Hemmed four sides, included. Grommets every 2 ft or four corners." },
      { label: "Delivery", value: "Print-ready PDF and high-res PNG" },
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
      { name: "Grommet Spec Sheet", price: 15, desc: "Print-ready grommet placement diagram" },
      { name: "Double Sided Design", price: 79, desc: "Full design for both sides" },
    ],
    faqs: [
      { q: "Should I choose vinyl or mesh?", a: "Scrim vinyl is the general-purpose choice and what most people want, indoors or out. Mesh is perforated so wind passes through it, which is what you need on a fence, a scaffold, or any exposed wall - a solid vinyl banner in that position acts like a sail and tears at the grommets." },
      { q: "What is the most common banner size?", a: "3 x 6 ft and 4 x 8 ft cover most storefronts and events. We print from 1 x 2 ft up to 4 x 12 ft, all hemmed on four sides, with grommets every 2 ft or in the four corners." },
      { q: "What bleed and safe zone do I need?", a: "We design with 0.125 in bleed on all sides. Roll-up stands keep important content at least 0.5 in from the edges to account for the retractable base. Vinyl banners include grommet placement guides on request." },
      { q: "What file format does the printer need?", a: "Most printers accept a high-resolution PDF. We deliver a print-ready PDF at the full bleed size, plus a high-resolution PNG." },
      { q: "Can I use my existing brand colors and logo?", a: "Yes. Upload your existing logo and brand guidelines in the order. If you do not have a style guide, fill out the brand questionnaire and our designer will match your colors as closely as possible." },
      { q: "Can I order a custom vinyl banner size?", a: "Yes. We support custom vinyl banner sizes from 1x2 ft up to 6x20 ft. Specify your dimensions in the order notes and we will match it precisely." },
    ],
  },
  "rigid-signs": {
    slug: "rigid-signs",
    name: "Rigid Signs",
    tagline: "Die-cut rigid signage in custom shapes and materials: acrylic, aluminum, PVC, foam board, and corrugated plastic.",
    description:
      "Custom rigid sign designs cut to shape (circle, star, arrow, house, or rounded square) in the material that fits your use case. Files include proper bleed and a clean die line for professional cutting.",
    icon: "🪧",
    specs: [
      { label: "Shapes", value: "Rectangle, Square, Circle, Oval, Star, Octagon, Arrow, House, Apartment" },
      { label: "Materials", value: "Yard Sign, Corrugated Plastic, PVC, Foam Board, Aluminium" },
      { label: "Sizes", value: '6" x 18" up to 48" x 96" depending on material and shape' },
      { label: "Bleed", value: "0.125 in on all sides" },
      { label: "Safe Zone", value: "0.25 in from the cut line" },
      { label: "Delivery", value: "Print-ready PDF cut to shape, high-res PNG" },
    ],
    packages: [
      { name: "Silver", price: 59, features: ["1-2 images or logos", "Basic copy", "Up to 4 revisions", "Print-ready PDF with die line"] },
      { name: "Gold", price: 99, popular: true, features: ["3-4 images or logos", "Basic copy", "Up to 6 revisions", "Print-ready PDF with die line", "Two layout concepts"] },
      { name: "Platinum", price: 149, features: ["5 or more images or logos", "Comprehensive copy", "Up to 8 revisions", "Full file bundle", "Three layout concepts", "Priority delivery"] },
    ],
    addOns: [
      { name: "Rush Delivery", price: 59, desc: "Completed within 24 hours" },
      { name: "Extra Concept", price: 39, desc: "One additional layout concept" },
      { name: "Custom Shape", price: 79, desc: "A die-cut shape beyond the standard set, cut to your outline" },
      { name: "Mounting Hardware Spec", price: 15, desc: "Print-ready standoff or bracket placement diagram" },
    ],
    faqs: [
      { q: "Which material should I choose?", a: "Acrylic and aluminum give a premium, long-lasting look for storefronts and offices. PVC and foam board are lightweight and budget-friendly for indoor use or short-term displays. Corrugated plastic is the most weather-resistant, affordable choice for yard and event signs. Tell us your use case and we'll recommend the right material." },
      { q: "Can I get a shape that's not in the standard list?", a: "Yes. Add the Custom Shape add-on and describe (or upload) the outline you need. We'll cut a die line to match." },
      { q: "How does the die line work?", a: "We design on a standard rectangular canvas sized to comfortably contain your chosen shape, then apply the shape as a precise cut line at export. What you design maps exactly onto the final die-cut sign, with 0.125 in bleed so color runs to the edge with no white gaps." },
      { q: "What file format does the printer need?", a: "We deliver a print-ready PDF with the die line marked, plus a high-res JPG preview. Both include bleed and safe-zone guides." },
      { q: "Can I use my existing brand colors and logo?", a: "Yes. Upload your existing logo and brand guidelines in the order. If you do not have a style guide, fill out the brand questionnaire and our designer will match your colors as closely as possible." },
    ],
  },
  "window-decals": {
    slug: "window-decals",
    name: "Window Decals",
    tagline: "Turn your storefront glass into your best salesperson. Decals, clings, and perforated film.",
    description:
      "Custom window graphics printed on adhesive vinyl, static cling, or see-through perforated film. Cut to eleven shapes in sizes from 6 inches to 5 feet, with no residue on removal.",
    icon: "🪟",
    specs: [
      { label: "Films", value: "3 mil Adhesive Vinyl, 8 mil White Cling Vinyl, 6 mil 70/30 Perforated" },
      { label: "Shapes", value: "Rectangle, Rounded Rectangle, Square, Circle, Oval, Star, Octagon, Arrow, House, Apartment" },
      { label: "Sizes", value: '24" x 6" up to 60" x 40", 117 sizes across all shapes' },
      { label: "Printing", value: "Full colour on the face. Eco-solvent inks." },
      { label: "Bleed", value: "0.125 in on all sides" },
      { label: "Safe Zone", value: "0.5 in from the cut line" },
      { label: "Resolution", value: "150 DPI at finished size" },
      { label: "Delivery", value: "Print-ready PDF cut to shape, high-res PNG" },
    ],
    packages: [
      { name: "Silver", price: 59, features: ["1-2 images or logos", "Basic copy", "Up to 4 revisions", "Print-ready PDF with cut line"] },
      { name: "Gold", price: 99, popular: true, features: ["3-4 images or logos", "Basic copy", "Up to 6 revisions", "Print-ready PDF with cut line", "Two layout concepts"] },
      { name: "Platinum", price: 149, features: ["5 or more images or logos", "Comprehensive copy", "Up to 8 revisions", "Full file bundle", "Three layout concepts", "Priority delivery"] },
    ],
    addOns: [
      { name: "Rush Delivery", price: 59, desc: "Completed within 24 hours" },
      { name: "Extra Concept", price: 39, desc: "One additional layout concept" },
      { name: "Reverse Reading Setup", price: 25, desc: "Artwork mirrored for second-surface application, applied inside the glass" },
      { name: "Application Guide", price: 15, desc: "Printed placement and squeegee guide sized to your window" },
    ],
    faqs: [
      { q: "What is the difference between a decal, a cling, and a perf?", a: "A decal is adhesive vinyl - it sticks to any clean flat surface, inside or out, and is the hard-wearing choice for anything staying up more than a season. A cling has no adhesive at all; static holds it to glass, so it repositions freely and is ideal for offers you change monthly. A perf is perforated film: from outside it reads as a solid graphic, from inside you can still see out, which is what you want across a window your staff or customers sit behind." },
      { q: "Will it damage my glass or leave residue?", a: "No. All three films are removable and leave no residue behind. Clings lift off with no effort at all; decals and perfs peel away cleanly, and warming them with a hairdryer makes a large one easier to lift in one piece." },
      { q: "Can you print something that reads correctly from inside the store?", a: "Yes. Add Reverse Reading Setup and we mirror the artwork for second-surface application, where the decal goes on the inside face of the glass and reads correctly from the street. This also protects the print from weather and scratching." },
      { q: "How do I measure my window?", a: "Measure the glass itself, not the frame, and take the smallest width and height if the pane is not perfectly square. Then pick the next size down - a decal sized to the exact opening leaves no room to position it, and a half-inch of clear glass around the graphic looks deliberate rather than tight." },
      { q: "How long do window graphics last outdoors?", a: "Adhesive vinyl holds up for three to five years outdoors and effectively indefinitely inside. Perforated film runs about three years outdoors. Clings are an indoor product and are best treated as seasonal - they are made to be swapped, not to weather." },
      { q: "Do you print white ink?", a: "No. The films print full colour on white or clear stock, and anything left unprinted on the clear films shows the glass behind it. If your design needs white type, set it on a printed colour background rather than relying on white ink." },
    ],
  },
};
