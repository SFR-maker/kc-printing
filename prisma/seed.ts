import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = new (PrismaClient as any)({ adapter });

async function main() {
  console.log("Seeding KC Printing database...");

  // Site settings
  const settings = [
    { key: "site_name", value: "KC Printing", type: "STRING" as const },
    { key: "phone", value: "(816) 521-0462", type: "STRING" as const },
    { key: "email", value: "kansasdesigners@gmail.com", type: "STRING" as const },
    { key: "domain", value: "kcprinting.com", type: "STRING" as const },
    { key: "maintenance_mode", value: "false", type: "BOOL" as const },
    { key: "ai_model", value: "anthropic/claude-haiku-4-5", type: "STRING" as const },
    { key: "ai_rate_limit_per_hour", value: "10", type: "NUMBER" as const },
    { key: "hero_headline", value: "Premium Print and Design Services, Delivered Online", type: "STRING" as const },
    { key: "hero_subheadline", value: "Business cards, postcards, banners, logos, and websites. Fast, professional, print-ready.", type: "STRING" as const },
    { key: "hero_cta", value: "Start Your Order", type: "STRING" as const },
    { key: "social_instagram", value: "", type: "STRING" as const },
    { key: "social_facebook", value: "", type: "STRING" as const },
    { key: "social_twitter", value: "", type: "STRING" as const },
  ];

  for (const s of settings) {
    await db.siteSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, type: s.type },
      create: { key: s.key, value: s.value, type: s.type },
    });
  }

  // Products
  const businessCards = await db.product.upsert({
    where: { slug: "business-cards" },
    update: {},
    create: {
      slug: "business-cards",
      name: "Business Cards",
      description: "Custom designed business cards in standard and specialty shapes. Print-ready files delivered fast.",
      category: "print",
      sortOrder: 1,
      options: {
        create: [
          { type: "SIZE", label: "Standard 2\" x 3.5\"", value: "2x3.5", sortOrder: 1 },
          { type: "SIZE", label: "Square 2.5\" x 2.5\"", value: "square-2.5x2.5", sortOrder: 2 },
          { type: "SIZE", label: "Slim 1.75\" x 3.5\"", value: "slim-1.75x3.5", sortOrder: 3 },
          { type: "SIZE", label: "Circle 2.5\" dia.", value: "circle-2.5", sortOrder: 4 },
          { type: "SIZE", label: "Leaf Shape", value: "leaf", sortOrder: 5 },
          { type: "PAPER", label: "14pt Gloss Coated", value: "14pt-gloss", sortOrder: 1 },
          { type: "PAPER", label: "14pt Uncoated", value: "14pt-uncoated", sortOrder: 2 },
          { type: "PAPER", label: "16pt Matte", value: "16pt-matte", sortOrder: 3 },
          { type: "PAPER", label: "Ultra Thick 32pt", value: "32pt-ultra", sortOrder: 4 },
        ],
      },
      packages: {
        create: [
          { name: "Silver", price: 39, sortOrder: 1, features: ["1-2 images or logos", "Basic copy included", "Up to 4 revisions", "Print-ready PDF + JPG", "3-5 business day delivery"] },
          { name: "Gold", price: 49, sortOrder: 2, features: ["3-4 images or logos", "Basic copy included", "Up to 6 revisions", "Print-ready PDF + JPG + PNG", "2-3 business day delivery", "Two layout concepts"] },
          { name: "Platinum", price: 69, sortOrder: 3, features: ["5+ images or logos", "Comprehensive copy", "Up to 8 revisions", "Full file bundle (PDF, JPG, PNG, AI)", "Priority 1-2 business day delivery", "Three layout concepts", "Front and back design"] },
        ],
      },
      addOns: {
        create: [
          { name: "Back Side Design", price: 29, description: "Full design for the back of your card" },
          { name: "Rush Delivery (24hr)", price: 49, description: "Guaranteed completion within 24 hours" },
          { name: "QR Code", price: 15, description: "Custom QR code linking to your website or social profile" },
          { name: "Extra Concept", price: 25, description: "One additional layout concept to choose from" },
        ],
      },
    },
  });

  const postcards = await db.product.upsert({
    where: { slug: "postcards" },
    update: {},
    create: {
      slug: "postcards",
      name: "Postcards",
      description: "Eye-catching postcard designs for marketing campaigns, EDDM mailers, and promotions.",
      category: "print",
      sortOrder: 2,
      options: {
        create: [
          { type: "SIZE", label: "3\" x 5\"", value: "3x5", sortOrder: 1 },
          { type: "SIZE", label: "4\" x 6\"", value: "4x6", sortOrder: 2 },
          { type: "SIZE", label: "5\" x 7\"", value: "5x7", sortOrder: 3 },
          { type: "SIZE", label: "5.5\" x 8.5\"", value: "5.5x8.5", sortOrder: 4 },
          { type: "SIZE", label: "6\" x 9\"", value: "6x9", sortOrder: 5 },
          { type: "SIZE", label: "6\" x 11\"", value: "6x11", sortOrder: 6 },
          { type: "PAPER", label: "14pt Gloss", value: "14pt-gloss", sortOrder: 1 },
          { type: "PAPER", label: "16pt Matte", value: "16pt-matte", sortOrder: 2 },
          { type: "PAPER", label: "Smooth White", value: "smooth-white", sortOrder: 3 },
          { type: "ORIENTATION", label: "Front Only", value: "front-only", sortOrder: 1 },
          { type: "ORIENTATION", label: "Front and Back", value: "front-back", sortOrder: 2 },
        ],
      },
      packages: {
        create: [
          { name: "Silver", price: 49, sortOrder: 1, features: ["1-2 images or logos", "Basic copy included", "Up to 4 revisions", "Front side design", "Print-ready files"] },
          { name: "Gold", price: 69, sortOrder: 2, features: ["3-4 images or logos", "Basic copy included", "Up to 6 revisions", "Front and back design", "EDDM address panel option"] },
          { name: "Platinum", price: 89, sortOrder: 3, features: ["5+ images or logos", "Comprehensive copy", "Up to 8 revisions", "Front and back design", "EDDM ready", "Mailing campaign layout", "Full file bundle"] },
        ],
      },
      addOns: {
        create: [
          { name: "EDDM Panel", price: 20, description: "Every Door Direct Mail address area and postage zone" },
          { name: "Rounded Corners", price: 15, description: "Rounded corner specification for premium look" },
          { name: "Rush Delivery (24hr)", price: 49, description: "Guaranteed completion within 24 hours" },
        ],
      },
    },
  });

  const logoDesign = await db.product.upsert({
    where: { slug: "logo-design" },
    update: {},
    create: {
      slug: "logo-design",
      name: "Logo Design",
      description: "Professional logo design with full ownership transfer. Delivered in EPS, PDF, JPG, PNG, and SVG.",
      category: "branding",
      sortOrder: 3,
      packages: {
        create: [
          { name: "Basic", price: 100, sortOrder: 1, features: ["Mostly text-based logo", "Simple icon element", "Up to 4 revisions", "EPS, PDF, JPG, PNG delivery", "Full ownership transfer"] },
          { name: "Plus", price: 250, sortOrder: 2, features: ["Detailed text or graphic mark", "Up to 6 revisions", "EPS, PDF, JPG, PNG, SVG delivery", "Full ownership transfer", "Color palette recommendations", "2 initial concepts"] },
          { name: "Deluxe", price: 350, sortOrder: 3, features: ["Complex illustrated logo", "Up to 8 revisions", "Full file bundle (all formats)", "Full ownership transfer", "Brand color palette", "3 initial concepts", "Brand usage guide"] },
        ],
      },
      addOns: {
        create: [
          { name: "Business Card Design", price: 39, description: "Business card design using your new logo" },
          { name: "Social Media Kit", price: 59, description: "Profile images and cover photos for 3 platforms" },
          { name: "Brand Guide", price: 79, description: "One-page brand style guide with colors, fonts, and logo rules" },
          { name: "Rush Delivery (48hr)", price: 99, description: "Logo completed within 48 hours" },
        ],
      },
    },
  });

  const webDesign = await db.product.upsert({
    where: { slug: "web-design" },
    update: {},
    create: {
      slug: "web-design",
      name: "Website Design",
      description: "Custom website design for businesses of all sizes. SEO-optimized, mobile-ready, and conversion focused.",
      category: "web",
      sortOrder: 4,
      packages: {
        create: [
          { name: "One Page", price: 299, sortOrder: 1, features: ["Single page design", "Mobile responsive", "Contact section", "Up to 4 revisions", "Delivered as Figma + HTML or handoff to your developer"] },
          { name: "5-Page Business", price: 599, sortOrder: 2, features: ["5 pages (Home, About, Services, Portfolio, Contact)", "Mobile responsive", "SEO-optimized structure", "Up to 6 revisions", "Google Analytics setup notes"] },
          { name: "Full SEO Website", price: 899, sortOrder: 3, features: ["Up to 10 pages", "Full SEO and GEO optimization", "Schema markup", "Mobile responsive", "Up to 8 revisions", "Sitemap", "Meta tags per page"] },
          { name: "E-Commerce", price: 1299, sortOrder: 4, features: ["Full e-commerce design", "Product pages", "Cart and checkout flow", "Mobile responsive", "Up to 10 revisions", "Payment gateway integration design"] },
          { name: "Booking Website", price: 799, sortOrder: 5, features: ["Booking flow design", "Service listing pages", "Calendar integration layout", "Mobile responsive", "Up to 8 revisions"] },
          { name: "AI-Powered Content", price: 499, sortOrder: 6, features: ["AI-generated homepage copy", "SEO meta titles and descriptions", "FAQ content generation", "Service page copy", "Up to 6 revisions"] },
        ],
      },
      addOns: {
        create: [
          { name: "Copywriting", price: 199, description: "Professional copywriting for all pages" },
          { name: "Logo Design", price: 149, description: "Plus-tier logo included with your website package" },
          { name: "Maintenance (monthly)", price: 99, description: "Monthly content updates and technical maintenance" },
          { name: "Rush Delivery", price: 199, description: "Priority delivery within 5 business days" },
          { name: "Google Business Profile Pack", price: 79, description: "10 branded images optimized for Google Business Profile" },
          { name: "SEO Schema Pack", price: 129, description: "Full schema.org markup for all pages" },
          { name: "AI SEO and GEO Pack", price: 149, description: "AI-optimized content for both traditional search and AI search engines" },
        ],
      },
    },
  });

  const rollUpBanners = await db.product.upsert({
    where: { slug: "roll-up-banners" },
    update: {},
    create: {
      slug: "roll-up-banners",
      name: "Roll-Up Banners",
      description: "Professional retractable banner stand designs. Print-ready files with proper bleed and safe zones.",
      category: "print",
      sortOrder: 5,
      options: {
        create: [
          { type: "SIZE", label: "24\" x 81\" (Small)", value: "24x81", sortOrder: 1 },
          { type: "SIZE", label: "33\" x 81\" (Standard)", value: "33x81", sortOrder: 2 },
          { type: "SIZE", label: "36\" x 81\" (Wide)", value: "36x81", sortOrder: 3 },
          { type: "SIZE", label: "Table-Top 24\" x 63\"", value: "24x63-tabletop", sortOrder: 4 },
        ],
      },
      packages: {
        create: [
          { name: "Silver", price: 79, sortOrder: 1, features: ["1-2 images or logos", "Basic copy", "Up to 4 revisions", "Print-ready PDF with bleed", "Safe zone guidelines included"] },
          { name: "Gold", price: 139, sortOrder: 2, features: ["3-4 images or logos", "Basic copy", "Up to 6 revisions", "Print-ready PDF with bleed", "Two concept layouts"] },
          { name: "Platinum", price: 199, sortOrder: 3, features: ["5+ images or logos", "Comprehensive copy", "Up to 8 revisions", "Full file bundle", "Three concept layouts", "Priority delivery"] },
        ],
      },
      addOns: {
        create: [
          { name: "Rush Delivery (24hr)", price: 79, description: "Completed within 24 hours" },
          { name: "Extra Concept", price: 49, description: "One additional layout concept" },
          { name: "Matching Business Card", price: 39, description: "Matching business card design to go with your banner" },
        ],
      },
    },
  });

  const vinylBanners = await db.product.upsert({
    where: { slug: "vinyl-banners" },
    update: {},
    create: {
      slug: "vinyl-banners",
      name: "Vinyl Banners",
      description: "Large format vinyl banner designs for events, storefronts, and outdoor promotions.",
      category: "print",
      sortOrder: 6,
      options: {
        create: [
          { type: "SIZE", label: "2' x 4'", value: "2x4", sortOrder: 1 },
          { type: "SIZE", label: "2' x 6'", value: "2x6", sortOrder: 2 },
          { type: "SIZE", label: "3' x 6'", value: "3x6", sortOrder: 3 },
          { type: "SIZE", label: "3' x 8'", value: "3x8", sortOrder: 4 },
          { type: "SIZE", label: "4' x 8'", value: "4x8", sortOrder: 5 },
          { type: "SIZE", label: "4' x 10'", value: "4x10", sortOrder: 6 },
          { type: "SIZE", label: "Custom Size", value: "custom", sortOrder: 7 },
          { type: "PAPER", label: "13oz Scrim Gloss Vinyl", value: "13oz-gloss", sortOrder: 1 },
          { type: "PAPER", label: "13oz Scrim Matte Vinyl", value: "13oz-matte", sortOrder: 2 },
          { type: "PAPER", label: "8oz Mesh Vinyl", value: "8oz-mesh", sortOrder: 3 },
        ],
      },
      packages: {
        create: [
          { name: "Silver", price: 79, sortOrder: 1, features: ["1-2 images or logos", "Basic copy", "Up to 4 revisions", "Print-ready PDF (0.125\" bleed)"] },
          { name: "Gold", price: 139, sortOrder: 2, features: ["3-4 images or logos", "Basic copy", "Up to 6 revisions", "Print-ready PDF", "Two layout concepts"] },
          { name: "Platinum", price: 199, sortOrder: 3, features: ["5+ images or logos", "Comprehensive copy", "Up to 8 revisions", "Full file bundle", "Grommet placement guide"] },
        ],
      },
      addOns: {
        create: [
          { name: "Grommet Spec Sheet", price: 15, description: "Print-ready grommet placement diagram" },
          { name: "Rush Delivery (24hr)", price: 79, description: "Completed within 24 hours" },
          { name: "Double Sided Design", price: 79, description: "Full design for both sides of banner" },
        ],
      },
    },
  });

  const printDesign = await db.product.upsert({
    where: { slug: "print-design" },
    update: {},
    create: {
      slug: "print-design",
      name: "Print and Brand Design",
      description: "General print and brand design services including flyers, brochures, letterheads, and more.",
      category: "print",
      sortOrder: 7,
      packages: {
        create: [
          { name: "Silver", price: 59, sortOrder: 1, features: ["Single-page design", "1-2 images or logos", "Up to 4 revisions", "Print-ready PDF"] },
          { name: "Gold", price: 99, sortOrder: 2, features: ["Multi-panel or two-sided", "3-4 images or logos", "Up to 6 revisions", "Print-ready PDF + PNG"] },
          { name: "Platinum", price: 149, sortOrder: 3, features: ["Complex layout or multi-page", "5+ images or logos", "Up to 8 revisions", "Full file bundle", "Priority delivery"] },
        ],
      },
      addOns: {
        create: [
          { name: "Rush Delivery (24hr)", price: 49, description: "Completed within 24 hours" },
          { name: "Copywriting", price: 79, description: "Professional copy written for your piece" },
        ],
      },
    },
  });

  // Portfolio items
  const portfolioItems = [
    { title: "Riverside Auto Repair Rebrand", category: "logo-design", description: "Complete logo and brand identity for a Kansas City auto repair shop.", imageUrl: "/portfolio/auto-repair.jpg", tags: ["logo", "branding", "KC"], featured: true, sortOrder: 1 },
    { title: "Green Leaf Catering", category: "business-cards", description: "Elegant business card design with leaf motif and earth tones.", imageUrl: "/portfolio/catering-cards.jpg", tags: ["business-cards", "print"], featured: true, sortOrder: 2 },
    { title: "Plano Real Estate Group", category: "web-design", description: "5-page business website with lead capture and listings layout.", imageUrl: "/portfolio/real-estate-web.jpg", tags: ["web", "real-estate", "Plano"], featured: true, sortOrder: 3 },
    { title: "KC Food Festival 2025", category: "vinyl-banners", description: "8ft x 4ft event banner for annual food festival in Kansas City.", imageUrl: "/portfolio/food-festival-banner.jpg", tags: ["banner", "event", "KC"], featured: false, sortOrder: 4 },
  ];

  for (const item of portfolioItems) {
    await db.portfolioItem.upsert({
      where: { id: item.title.replace(/\s+/g, "-").toLowerCase() },
      update: {},
      create: { id: item.title.replace(/\s+/g, "-").toLowerCase(), ...item },
    });
  }

  // Testimonials
  const testimonials = [
    { name: "Maria Torres", company: "Torres Bakery", role: "Owner", text: "KC Printing delivered a stunning business card design in less than 24 hours. The colors were perfect and the file was print-ready. Highly recommend.", rating: 5, approved: true, featured: true },
    { name: "James Whitfield", company: "Whitfield Law Group", role: "Managing Partner", text: "We needed a complete rebrand with logo and postcards. The team nailed it on the first concept. Professional, fast, and priced fairly.", rating: 5, approved: true, featured: true },
    { name: "Alicia Nguyen", company: "Bloom Wellness Spa", role: "Director", text: "Our retractable banner and matching business cards look incredible at trade shows. Clients always ask where we got them designed.", rating: 5, approved: true, featured: true },
    { name: "Derek Okafor", company: "Okafor Construction", role: "CEO", text: "Fast turnaround on a 4x8 vinyl banner. The designer followed our brand colors exactly and the file was perfect for our printer.", rating: 5, approved: true, featured: false },
    { name: "Sandra Bell", company: "Bell Dental Group", role: "Office Manager", text: "Our new website design increased patient inquiries from the first week. Clean, professional, and exactly what a dental office needs.", rating: 5, approved: true, featured: true },
    { name: "Carlos Reyes", company: "Reyes Landscaping", role: "Owner", text: "Ordered postcard designs for our EDDM campaign. The design was clear, the CTA was strong, and the print files worked perfectly.", rating: 5, approved: true, featured: false },
  ];

  for (let i = 0; i < testimonials.length; i++) {
    const t = testimonials[i];
    await db.testimonial.upsert({
      where: { id: `seed-testimonial-${i + 1}` },
      update: {},
      create: { id: `seed-testimonial-${i + 1}`, ...t },
    });
  }

  // Page SEO
  const pages = [
    { path: "/", title: "KC Printing - Premium Print and Design Services Online | Kansas City", description: "Custom business cards, postcards, banners, logo design, and website design. Fast online ordering. Serving Kansas City, Dallas, Plano, and nationwide." },
    { path: "/services", title: "Design Services - Business Cards, Banners, Logos, Websites | KC Printing", description: "Browse all KC Printing services: business cards, postcards, vinyl banners, roll-up banners, logo design, website design, and general print design." },
    { path: "/services/business-cards", title: "Custom Business Card Design | KC Printing", description: "Professional business card design starting at $39. Standard, square, slim, circle, and leaf shapes. 300-350 DPI print-ready files. Free revisions included." },
    { path: "/services/postcards", title: "Postcard Design for Marketing and EDDM | KC Printing", description: "Custom postcard design starting at $49. Multiple sizes, front and back, EDDM-ready. Fast turnaround for Kansas City and nationwide marketing campaigns." },
    { path: "/services/logo-design", title: "Professional Logo Design with Full Ownership | KC Printing", description: "Logo design packages starting at $100. All formats delivered: EPS, PDF, JPG, PNG, SVG. Full ownership transfer. Kansas City and nationwide." },
    { path: "/services/web-design", title: "Custom Website Design - SEO Optimized | KC Printing", description: "Website design from single-page to full e-commerce. SEO-optimized, mobile-ready, AI-assisted content. Serving businesses in Kansas City, Dallas, and online nationwide." },
    { path: "/services/roll-up-banners", title: "Roll-Up and Retractable Banner Design | KC Printing", description: "Retractable banner stand designs starting at $79. Standard and wide sizes. Print-ready with proper bleed and safe zones. Fast turnaround." },
    { path: "/services/vinyl-banners", title: "Vinyl Banner Design for Events and Storefronts | KC Printing", description: "Large format vinyl banner design starting at $79. All sizes from 2x4 to 4x10. Mesh, gloss, and matte vinyl options. Print-ready files delivered fast." },
    { path: "/services/print-design", title: "General Print and Brand Design Services | KC Printing", description: "Flyers, brochures, letterheads, and more. Starting at $59. Print-ready files, multiple revisions included. Kansas City and nationwide." },
    { path: "/pricing", title: "Transparent Pricing for All Design Services | KC Printing", description: "Clear, upfront pricing for business cards, postcards, banners, logos, and websites. No hidden fees. Multiple packages to fit any budget." },
    { path: "/portfolio", title: "Design Portfolio | KC Printing", description: "See samples of our business card, logo, postcard, banner, and website design work for clients in Kansas City, Dallas, and nationwide." },
    { path: "/about", title: "About KC Printing - Online Design Studio | Kansas City", description: "KC Printing is a fully online design studio serving Kansas City, Dallas, Plano, Addison, Overland Park, and businesses nationwide. Fast, professional, print-ready." },
    { path: "/contact", title: "Contact KC Printing | Call or Text (816) 521-0462", description: "Get in touch with KC Printing for custom design quotes. Call or text (816) 521-0462, email kansasdesigners@gmail.com, or submit a request online." },
    { path: "/faq", title: "Frequently Asked Questions | KC Printing", description: "Answers to common questions about KC Printing design services, file formats, turnaround times, revisions, and ordering." },
  ];

  for (const p of pages) {
    await db.pageSeo.upsert({
      where: { path: p.path },
      update: { title: p.title, description: p.description },
      create: { path: p.path, title: p.title, description: p.description },
    });
  }

  // Seed coupon
  await db.coupon.upsert({
    where: { code: "LAUNCH20" },
    update: {},
    create: {
      code: "LAUNCH20",
      discount: 20,
      type: "PERCENT",
      usageLimit: 100,
      active: true,
    },
  });

  console.log("Seed complete.");
  console.log("\nLocal dev credentials:");
  console.log("  Admin email:    admin@kcprinting.com");
  console.log("  Customer email: customer@test.com");
  console.log("  Coupon code:    LAUNCH20 (20% off)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
