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
  "logo-design": {
    slug: "logo-design",
    name: "Logo Design",
    tagline: "A logo that works everywhere. Full ownership. All file formats.",
    description:
      "Professional logo design from simple text marks to complex illustrated logos. Full ownership is transferred to you upon completion. Every logo is delivered in all standard file formats.",
    icon: "✦",
    specs: [
      { label: "File Delivery", value: "EPS, PDF, High-resolution JPG, Transparent PNG, SVG" },
      { label: "Ownership", value: "Full copyright and usage rights transferred to client" },
      { label: "Color Modes", value: "Full color, black, white, grayscale versions included" },
      { label: "Questionnaire", value: "Brand questionnaire completed before design begins" },
      { label: "Concepts", value: "1-3 initial concepts depending on package" },
      { label: "Revisions", value: "4-8 revisions included depending on package" },
    ],
    packages: [
      { name: "Basic", price: 100, features: ["Mostly text-based logo", "Simple icon element", "Up to 4 revisions", "EPS, PDF, JPG, PNG delivery", "Full ownership transfer", "1 initial concept"] },
      { name: "Plus", price: 250, popular: true, features: ["Detailed text or graphic mark", "Up to 6 revisions", "EPS, PDF, JPG, PNG, SVG delivery", "Full ownership transfer", "Color palette recommendations", "2 initial concepts"] },
      { name: "Deluxe", price: 350, features: ["Complex illustrated logo", "Up to 8 revisions", "Full file bundle in all formats", "Full ownership transfer", "Brand color palette", "3 initial concepts", "Brand usage guide"] },
    ],
    addOns: [
      { name: "Business Card Design", price: 39, desc: "Business card design using your new logo" },
      { name: "Social Media Kit", price: 59, desc: "Profile images and cover photos for 3 platforms" },
      { name: "Brand Guide", price: 79, desc: "One-page brand style guide with colors, fonts, and logo rules" },
      { name: "Rush Delivery", price: 99, desc: "Logo completed within 48 hours" },
    ],
    faqs: [
      { q: "Do I own the logo when it is completed?", a: "Yes. Full copyright and usage rights are transferred to you upon final payment. You may use the logo on any printed or digital materials without restriction." },
      { q: "What file formats will I receive?", a: "Every logo is delivered as EPS (vector), PDF (vector), high-resolution JPG, transparent PNG, and SVG. The Plus and Deluxe packages include all five formats. The Basic package includes EPS, PDF, JPG, and PNG." },
      { q: "What is the brand questionnaire?", a: "Before design begins, you complete a short questionnaire covering your business name, industry, target audience, preferred colors, competitors, tone, and any logo inspiration. This helps the designer create something that fits your brand." },
      { q: "What is the difference between the packages?", a: "The Basic package is best for simple text-based logos with a small icon. Plus is suited for more detailed wordmarks or icon combinations. Deluxe is for complex illustrated logos that require more drafting and refinement time." },
      { q: "Can I request changes after I receive the final files?", a: "Changes after final file delivery are treated as a new revision order. We recommend using all included revisions before approving the final design to ensure you are fully satisfied." },
      { q: "How long does logo design take?", a: "Basic logos typically take 3-5 business days for the first concept. Plus and Deluxe take 5-7 business days. Rush delivery is available for the Basic and Plus packages." },
    ],
  },
  "web-design": {
    slug: "web-design",
    name: "Website Design",
    tagline: "Custom websites that are SEO-optimized, mobile-ready, and built to convert.",
    description:
      "Professional website design from single-page landing pages to full e-commerce stores. Every website is designed for speed, mobile devices, and search engine visibility. AI-assisted content generation included.",
    icon: "🌐",
    specs: [
      { label: "Packages", value: "One-page, 5-page, Full SEO, E-commerce, Booking, AI Content" },
      { label: "Delivery Format", value: "Figma files and HTML or handoff to your developer" },
      { label: "SEO", value: "Meta titles, descriptions, schema markup, sitemap notes" },
      { label: "Mobile", value: "Fully responsive layout for all screen sizes" },
      { label: "AI Features", value: "AI-generated copy, SEO content, FAQ, and proposal" },
      { label: "Add-Ons", value: "Copywriting, logo, maintenance, Google Business, AI SEO" },
    ],
    packages: [
      { name: "One Page", price: 299, features: ["Single page layout", "Mobile responsive", "Contact section", "Up to 4 revisions", "Figma and HTML delivery"] },
      { name: "5-Page Business", price: 599, popular: true, features: ["Home, About, Services, Portfolio, Contact", "Mobile responsive", "SEO-optimized structure", "Up to 6 revisions", "Google Analytics setup notes"] },
      { name: "Full SEO Site", price: 899, features: ["Up to 10 pages", "Full SEO and GEO optimization", "Schema markup", "Up to 8 revisions", "Sitemap", "Meta tags per page"] },
      { name: "E-Commerce", price: 1299, features: ["Full e-commerce design", "Product and cart pages", "Checkout flow design", "Up to 10 revisions", "Payment gateway integration design"] },
      { name: "Booking Site", price: 799, features: ["Booking flow design", "Service listing pages", "Calendar integration layout", "Mobile responsive", "Up to 8 revisions"] },
      { name: "AI Content Pack", price: 499, features: ["AI-generated homepage copy", "SEO meta titles and descriptions", "FAQ content", "Service page copy", "Up to 6 revisions"] },
    ],
    addOns: [
      { name: "Copywriting", price: 199, desc: "Professional copywriting for all pages" },
      { name: "Logo Design", price: 149, desc: "Plus-tier logo included with your site" },
      { name: "Maintenance", price: 99, desc: "Monthly content updates and support" },
      { name: "Rush Delivery", price: 199, desc: "Priority delivery within 5 business days" },
      { name: "Google Business Pack", price: 79, desc: "10 branded images for Google Business Profile" },
      { name: "SEO Schema Pack", price: 129, desc: "Full schema.org markup for all pages" },
      { name: "AI SEO and GEO Pack", price: 149, desc: "AI-optimized content for search and AI engines" },
    ],
    faqs: [
      { q: "Which website package should I choose?", a: "For a simple online presence or landing page, start with One Page. Most small businesses choose the 5-Page Business package. If local SEO is a priority, choose Full SEO. E-commerce is for businesses selling products online." },
      { q: "Do you build the website or just design it?", a: "We deliver fully designed files including Figma designs and HTML. If you need development, we can recommend trusted developers or discuss a complete build. Our core service focuses on design and layout." },
      { q: "Is the design mobile responsive?", a: "Yes. Every website design is built with mobile responsiveness in mind. We design for desktop, tablet, and mobile screen sizes." },
      { q: "What is the AI Content Pack?", a: "This add-on uses AI to generate high-quality homepage copy, service page content, SEO meta tags, and FAQ content for your specific business and industry. A human designer and copywriter reviews everything before delivery." },
      { q: "Can you design a website for any industry?", a: "Yes. We have designed websites for dental offices, law firms, restaurants, real estate agents, contractors, retail stores, and more. The brand questionnaire helps us understand your audience before we begin." },
      { q: "How long does website design take?", a: "One-page designs take 3-5 business days. Multi-page designs take 7-14 business days depending on complexity. Rush delivery is available as an add-on." },
    ],
  },
  "roll-up-banners": {
    slug: "roll-up-banners",
    name: "Roll-Up Banners",
    tagline: "Professional retractable banner stand designs. Print-ready, to spec, and delivered fast.",
    description:
      "Roll-up and retractable banner stand designs for trade shows, events, storefronts, and offices. Files include proper bleed and safe zone guides for professional printing.",
    icon: "🎯",
    specs: [
      { label: "Standard Sizes", value: "24x81, 33x81, 36x81 in" },
      { label: "Table-Top", value: "24x63 in" },
      { label: "Bleed", value: "0.125 in on all sides" },
      { label: "Safe Zone", value: "0.5 in from all edges" },
      { label: "Delivery", value: "Print-ready PDF with guides, high-res JPG" },
      { label: "Revisions", value: "4-8 revisions depending on package" },
    ],
    packages: [
      { name: "Silver", price: 79, features: ["1-2 images or logos", "Basic copy", "Up to 4 revisions", "Print-ready PDF with bleed", "Safe zone guidelines"] },
      { name: "Gold", price: 139, popular: true, features: ["3-4 images or logos", "Basic copy", "Up to 6 revisions", "Print-ready PDF with bleed", "Two layout concepts"] },
      { name: "Platinum", price: 199, features: ["5 or more images or logos", "Comprehensive copy", "Up to 8 revisions", "Full file bundle", "Three layout concepts", "Priority delivery"] },
    ],
    addOns: [
      { name: "Rush Delivery", price: 79, desc: "Completed within 24 hours" },
      { name: "Extra Concept", price: 49, desc: "One additional layout concept" },
      { name: "Matching Business Card", price: 39, desc: "Business card design that matches your banner" },
    ],
    faqs: [
      { q: "What is the most common roll-up banner size?", a: "The 33 x 81 in size is the industry standard for trade show banners. The 36 x 81 wide format is popular for high-traffic areas. The 24 x 63 table-top version is ideal for smaller events and countertops." },
      { q: "What bleed and safe zone do I need?", a: "We design with 0.125 in bleed on all sides and keep all important content at least 0.5 in from the edges. This ensures the design looks correct after the banner is loaded into the retractable base and the edges roll under." },
      { q: "What file format does the printer need?", a: "Most printers accept high-resolution PDF or JPG files. We deliver both. The PDF includes crop marks and bleed guides for professional printing services." },
      { q: "Can I use my existing brand colors and logo?", a: "Yes. Upload your existing logo and brand guidelines in the order. If you do not have a style guide, fill out the brand questionnaire and our designer will match your colors as closely as possible." },
      { q: "Is there a preview so I can see how it will look?", a: "Yes. We provide a digital mockup showing how the design will appear on the banner stand hardware before you approve the final files." },
      { q: "Can you match an existing brand look?", a: "Yes. Upload samples, existing materials, or reference images. We will match your fonts, colors, and style as closely as possible." },
    ],
  },
  "vinyl-banners": {
    slug: "vinyl-banners",
    name: "Vinyl Banners",
    tagline: "Large format banner designs for events, storefronts, and outdoor promotions.",
    description:
      "Custom vinyl banner designs from 2x4 ft to 4x10 ft and beyond. Available in mesh, gloss, and matte vinyl materials. Print-ready files with proper bleed and grommet placement specs.",
    icon: "🏷",
    specs: [
      { label: "Horizontal Sizes", value: "2x4, 2x6, 3x5, 3x6, 3x8, 4x6, 4x8, 4x10 ft" },
      { label: "Vertical Sizes", value: "2x3, 2x4, 3x4, 3x6 ft" },
      { label: "Square Sizes", value: "2x2, 3x3, 4x4 ft" },
      { label: "Full Range", value: "1x2 ft up to 6x20 ft custom" },
      { label: "Materials", value: "8oz Mesh, 13oz Scrim Gloss, 13oz Scrim Matte" },
      { label: "Bleed", value: "0.125 in on all sides" },
      { label: "Grommets", value: "Placement spec included in file" },
    ],
    packages: [
      { name: "Silver", price: 79, features: ["1-2 images or logos", "Basic copy", "Up to 4 revisions", "Print-ready PDF with 0.125 bleed"] },
      { name: "Gold", price: 139, popular: true, features: ["3-4 images or logos", "Basic copy", "Up to 6 revisions", "Print-ready PDF", "Two layout concepts"] },
      { name: "Platinum", price: 199, features: ["5 or more images or logos", "Comprehensive copy", "Up to 8 revisions", "Full file bundle", "Grommet placement guide"] },
    ],
    addOns: [
      { name: "Grommet Spec Sheet", price: 15, desc: "Print-ready grommet placement diagram" },
      { name: "Rush Delivery", price: 79, desc: "Completed within 24 hours" },
      { name: "Double Sided Design", price: 79, desc: "Full design for both sides of banner" },
    ],
    faqs: [
      { q: "What vinyl material should I choose?", a: "13oz scrim gloss vinyl is the standard choice for most outdoor banners. It produces vibrant colors and is weather resistant. 13oz matte is better for areas with strong light glare. 8oz mesh is recommended for windy locations as it allows air to pass through." },
      { q: "What size banner do I need?", a: "For storefronts, 3x8 or 4x8 ft are common. For trade shows, 2x6 or 3x6 ft work well. For large outdoor events, 4x8 or 4x10 ft are most visible. We can help you choose based on your viewing distance and mounting location." },
      { q: "What is the bleed requirement?", a: "We add 0.125 in bleed on all sides. This is standard for vinyl banner printing and ensures clean edges after the banner is hemmed and finished." },
      { q: "Do you include grommet placement?", a: "Yes. Our Platinum package and the Grommet Spec Sheet add-on include a diagram showing where grommets should be placed. This is essential for banners that will be hung with rope or bungees." },
      { q: "Can I order a custom size?", a: "Yes. We support any size from 1x2 ft up to 6x20 ft. Specify your dimensions in the order notes. Custom sizes are priced at the standard package rate." },
      { q: "How are the files delivered?", a: "You receive a print-ready PDF at 72-150 DPI (standard for large format printing at viewing distance) plus a high-resolution JPG. Files are ready to upload directly to most banner printing services." },
    ],
  },
  "print-design": {
    slug: "print-design",
    name: "Print and Brand Design",
    tagline: "Flyers, brochures, letterheads, and any print project. Delivered print-ready.",
    description:
      "General print and brand design services for any piece you need. Flyers, brochures, rack cards, door hangers, letterheads, envelopes, menus, programs, and more. Print-ready files for any printer.",
    icon: "🖨",
    specs: [
      { label: "Common Formats", value: "Flyers, brochures, rack cards, door hangers, menus" },
      { label: "Paper", value: "Standard and custom sizes supported" },
      { label: "Sides", value: "Single-sided or double-sided" },
      { label: "Bleed", value: "0.125 in standard bleed included" },
      { label: "Delivery", value: "Print-ready PDF, JPG, PNG" },
      { label: "Revisions", value: "4-8 revisions depending on package" },
    ],
    packages: [
      { name: "Silver", price: 59, features: ["Single-page or single-sided", "1-2 images or logos", "Up to 4 revisions", "Print-ready PDF"] },
      { name: "Gold", price: 99, popular: true, features: ["Multi-panel or two-sided", "3-4 images or logos", "Up to 6 revisions", "Print-ready PDF and PNG"] },
      { name: "Platinum", price: 149, features: ["Complex layout or multi-page", "5 or more images or logos", "Up to 8 revisions", "Full file bundle", "Priority delivery"] },
    ],
    addOns: [
      { name: "Rush Delivery", price: 49, desc: "Completed within 24 hours" },
      { name: "Copywriting", price: 79, desc: "Professional copy written for your piece" },
      { name: "Extra Page", price: 39, desc: "Add one additional page or panel" },
    ],
    faqs: [
      { q: "What types of print pieces can you design?", a: "We design flyers, brochures, tri-folds, rack cards, door hangers, letterheads, envelopes, menus, programs, sell sheets, and more. If it is a print piece, we can design it." },
      { q: "Can you design a multi-page document?", a: "Yes. The Platinum package covers complex or multi-page layouts. Specify the number of pages in your order notes. Additional pages are available as an add-on." },
      { q: "What is a rack card?", a: "A rack card is a single-panel card, typically 4x9 in, designed to stand upright in display racks at hotel lobbies, visitor centers, and retail locations. It is a common format for promotional materials." },
      { q: "Do you match existing brand materials?", a: "Yes. Upload your existing materials, logo, and brand guide. We will match your fonts, colors, and overall style to ensure consistency across all your print pieces." },
      { q: "What file format do I need for printing?", a: "Most commercial printers require a PDF file with bleed. We deliver print-ready PDFs with proper bleed and crop marks, plus a JPG and PNG for digital use." },
      { q: "Can I get a rush order for a same-day event?", a: "Rush delivery (24 hours) is available as an add-on. For truly urgent same-day needs, please contact us directly at (816) 521-0462 and we will do our best to accommodate." },
    ],
  },
};
