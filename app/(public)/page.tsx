import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Star, Zap, Shield, Clock, CheckCircle2, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "KC Printing - Premium Print and Design Services Online | Kansas City",
  description:
    "Custom business cards, postcards, banners, logo design, and website design. Fast online ordering, print-ready files. Serving Kansas City, Dallas, Plano, and nationwide.",
};

const SERVICES = [
  { name: "Business Cards", href: "/services/business-cards", icon: "🪪", price: "from $39", desc: "Standard, square, slim, circle, and leaf shapes. 14-32pt paper options." },
  { name: "Postcards", href: "/services/postcards", icon: "📬", price: "from $49", desc: "Multiple sizes, front and back, EDDM-ready for marketing campaigns." },
  { name: "Logo Design", href: "/services/logo-design", icon: "✦", price: "from $100", desc: "Professional logos with full ownership. All formats: EPS, PDF, SVG, PNG." },
  { name: "Website Design", href: "/services/web-design", icon: "🌐", price: "from $299", desc: "SEO-optimized, mobile-ready websites. One page to full e-commerce." },
  { name: "Roll-Up Banners", href: "/services/roll-up-banners", icon: "🎯", price: "from $79", desc: "Retractable banner stand designs with print-ready bleed and safe zones." },
  { name: "Vinyl Banners", href: "/services/vinyl-banners", icon: "🏷", price: "from $79", desc: "Large format banners from 2x4 to 4x10. Mesh, gloss, and matte vinyl." },
  { name: "Print Design", href: "/services/print-design", icon: "🖨", price: "from $59", desc: "Flyers, brochures, letterheads, and general brand design services." },
];

const TESTIMONIALS = [
  { name: "Maria Torres", company: "Torres Bakery", text: "KC Printing delivered a stunning business card design in less than 24 hours. The colors were perfect and the file was print-ready.", rating: 5 },
  { name: "James Whitfield", company: "Whitfield Law Group", text: "We needed a complete rebrand with logo and postcards. The team nailed it on the first concept. Professional, fast, and priced fairly.", rating: 5 },
  { name: "Sandra Bell", company: "Bell Dental Group", text: "Our new website design increased patient inquiries from the first week. Clean, professional, and exactly what a dental office needs.", rating: 5 },
];

const FAQS = [
  { q: "How does the ordering process work?", a: "Choose your service and package, upload your brand files or notes, and our designers get to work. You receive your first draft within 1-3 business days. Request revisions and download your final print-ready files when approved." },
  { q: "What file formats do you deliver?", a: "Design files are delivered print-ready. Business cards and postcards come as PDF with proper bleed. Logos are delivered as EPS, PDF, high-resolution JPG, transparent PNG, and SVG. Website designs come as Figma files or HTML handoff." },
  { q: "Do I need to provide any files?", a: "Not required but helpful. You can upload logos, brand colors, existing materials, or inspiration. If you have nothing, our AI-assisted brief tool will help capture your vision before the designer starts." },
  { q: "Can I request revisions?", a: "Yes. Every package includes a set number of included revisions ranging from 4 to 8 depending on the tier. Additional revisions are available at a flat rate if you need more." },
  { q: "Do you serve businesses outside Kansas City?", a: "Absolutely. KC Printing is a fully online design studio serving businesses in Kansas City, Dallas, Plano, Addison, Overland Park, and clients nationwide. All ordering and file delivery is done digitally." },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-kc-dark text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-kc-teal/20 via-transparent to-kc-coral/10 pointer-events-none" />
        <div className="container-tight section-pad relative z-10">
          <div className="max-w-3xl">
            <Badge className="mb-6 bg-kc-coral/20 text-kc-coral border-kc-coral/30 hover:bg-kc-coral/20">
              Fully Online Design Studio
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-6">
              Premium Print and Design Services,{" "}
              <span className="text-kc-coral">Delivered Online</span>
            </h1>
            <p className="text-lg text-white/70 leading-relaxed mb-8 max-w-2xl">
              Business cards, postcards, banners, logos, and websites. Fast turnaround, print-ready files, and AI-assisted creative direction. Serving Kansas City, Dallas, and businesses nationwide.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="bg-kc-coral hover:bg-kc-coral/90 text-white text-base px-8">
                <Link href="/services">
                  Start Your Order <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 text-base">
                <Link href="/portfolio">View Portfolio</Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="container-tight px-4 sm:px-6 lg:px-8 pb-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-white/10 pt-8">
            {[
              { value: "50+", label: "Clients Served" },
              { value: "98", label: "Avg. Quality Score" },
              { value: "4.9", label: "Client Rating" },
              { value: "24hr", label: "Rush Turnaround" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-black text-kc-coral">{stat.value}</div>
                <div className="text-sm text-white/50 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="section-pad bg-kc-bg">
        <div className="container-tight">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-kc-dark mb-3">Everything Your Brand Needs</h2>
            <p className="text-kc-muted max-w-xl mx-auto">
              One studio for all your print and digital design needs. Original files, real designers, real results.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {SERVICES.map((service) => (
              <Link key={service.href} href={service.href} className="group">
                <Card className="h-full border-kc-border hover:border-kc-teal/40 hover:shadow-lg transition-all duration-200">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="text-3xl mb-3">{service.icon}</div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-kc-dark group-hover:text-kc-teal transition-colors">{service.name}</h3>
                      <Badge variant="secondary" className="text-xs shrink-0 bg-kc-yellow/30 text-kc-dark border-0">
                        {service.price}
                      </Badge>
                    </div>
                    <p className="text-sm text-kc-muted leading-relaxed flex-1">{service.desc}</p>
                    <div className="mt-4 flex items-center gap-1 text-xs font-medium text-kc-teal">
                      Get started <ArrowRight className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section-pad bg-white">
        <div className="container-tight">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-kc-dark mb-3">How It Works</h2>
            <p className="text-kc-muted max-w-xl mx-auto">
              From idea to print-ready file in three simple steps.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Choose Your Service and Package", desc: "Select the service you need, pick a package tier, and add any extras. Our live price calculator shows your total instantly." },
              { step: "02", title: "Share Your Brand Info", desc: "Upload existing files, fill out a short brand questionnaire, or use our AI brief tool. Designers review everything before starting." },
              { step: "03", title: "Review, Revise, and Download", desc: "Get your first draft within 1-3 business days. Request revisions, approve the final design, and download your print-ready files." },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-start">
                <div className="text-5xl font-black text-kc-teal/20 mb-3">{item.step}</div>
                <h3 className="text-lg font-bold text-kc-dark mb-2">{item.title}</h3>
                <p className="text-sm text-kc-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Feature Banner */}
      <section className="section-pad bg-kc-teal text-white">
        <div className="container-tight">
          <div className="flex flex-col lg:flex-row items-center gap-8 justify-between">
            <div className="max-w-2xl">
              <Badge className="mb-4 bg-white/20 text-white border-white/30 hover:bg-white/20">
                AI-Assisted Creative Direction
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-black mb-4">
                AI Helps. Humans Perfect It.
              </h2>
              <p className="text-white/80 text-lg leading-relaxed">
                Every order includes optional AI tools to generate copy, suggest brand colors, create logo concepts, and write SEO-optimized content. A human designer reviews every output before anything reaches you.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm shrink-0">
              {[
                { icon: <Zap className="h-4 w-4" />, label: "AI Copy Generator" },
                { icon: <Shield className="h-4 w-4" />, label: "Human Review" },
                { icon: <Clock className="h-4 w-4" />, label: "Fast Turnaround" },
                { icon: <CheckCircle2 className="h-4 w-4" />, label: "Print-Ready Files" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2.5">
                  <span className="text-kc-coral">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-pad bg-kc-bg">
        <div className="container-tight">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-kc-dark mb-3">What Clients Say</h2>
            <p className="text-kc-muted max-w-xl mx-auto">Real results for real businesses across Kansas City and beyond.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="border-kc-border">
                <CardContent className="p-6">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-kc-yellow text-kc-yellow" />
                    ))}
                  </div>
                  <p className="text-kc-dark leading-relaxed mb-4 text-sm">"{t.text}"</p>
                  <div>
                    <div className="font-semibold text-kc-dark text-sm">{t.name}</div>
                    <div className="text-xs text-kc-muted">{t.company}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-pad bg-white">
        <div className="container-tight max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-black text-kc-dark mb-3">Frequently Asked Questions</h2>
          </div>
          <Accordion className="space-y-2">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-kc-border rounded-lg px-4">
                <AccordionTrigger className="text-left font-semibold text-kc-dark hover:text-kc-teal hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-kc-muted leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="text-center mt-8">
            <Button asChild variant="outline" className="border-kc-teal text-kc-teal hover:bg-kc-teal/5">
              <Link href="/faq">View All FAQs</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-pad bg-kc-dark text-white">
        <div className="container-tight text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
            Call, text, or start an order online. No contracts, no minimums. Just great design, delivered fast.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Button asChild size="lg" className="bg-kc-coral hover:bg-kc-coral/90 text-white px-8 w-full sm:w-auto">
              <Link href="/services">Browse All Services <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto">
              <Link href="/contact">Get a Free Quote</Link>
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-white/50">
            <a href="tel:+18165210462" className="flex items-center gap-2 hover:text-kc-coral transition-colors">
              <Phone className="h-4 w-4" /> (816) 521-0462
            </a>
            <a href="mailto:kansasdesigners@gmail.com" className="flex items-center gap-2 hover:text-kc-coral transition-colors">
              <Mail className="h-4 w-4" /> kansasdesigners@gmail.com
            </a>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                name: "KC Printing",
                url: "https://kcprinting.com",
                telephone: "+18165210462",
                email: "kansasdesigners@gmail.com",
                description: "Fully online print and design services studio.",
                areaServed: ["Kansas City, MO", "Dallas, TX", "Plano, TX", "Addison, TX", "Overland Park, KS", "United States"],
              },
              {
                "@type": "FAQPage",
                mainEntity: FAQS.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
              },
            ],
          }),
        }}
      />
    </>
  );
}
