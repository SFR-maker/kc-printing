import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Phone, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "About KC Printing - Online Design Studio",
  description:
    "KC Printing is a fully online design studio serving Kansas City, Dallas, Plano, Addison, Overland Park, and businesses nationwide. Fast, professional, print-ready.",
};

export default function AboutPage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-kc-bg section-pad">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-violet-500/[0.07] blur-3xl" />
        </div>
        <div className="container-tight relative z-10 max-w-3xl">
          <Badge className="mb-4 border-kc-teal/20 bg-kc-teal/8 text-kc-teal">About Us</Badge>
          <h1 className="mb-6 text-4xl font-black tracking-tight text-kc-dark sm:text-5xl">A Design Studio Built for the Modern Business Owner</h1>
          <p className="text-lg leading-relaxed text-kc-muted">
            KC Printing is a fully online print and design studio based in Kansas City, MO. We help small and mid-size businesses across the country get professional design work done fast, at a fair price, without the overhead of a traditional agency.
          </p>
        </div>
      </section>

      <section className="section-pad bg-white">
        <div className="container-tight grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-black text-kc-dark mb-4">What We Do</h2>
            <p className="text-kc-muted leading-relaxed mb-4">
              We specialize in print and digital design services: business cards, postcards, vinyl banners, roll-up banners, logo design, and website design. Every order is handled by real designers who care about your brand.
            </p>
            <p className="text-kc-muted leading-relaxed mb-4">
              We use AI tools to speed up the creative process, but every design is reviewed and refined by a human. You get the speed of automation with the quality of professional design.
            </p>
            <p className="text-kc-muted leading-relaxed">
              All file delivery is digital. We are a fully online studio, so we serve businesses anywhere in the United States while maintaining roots in the Kansas City area.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "50+", label: "Clients Served" },
              { value: "4.9", label: "Average Rating" },
              { value: "7", label: "Design Services" },
              { value: "24hr", label: "Rush Turnaround" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-kc-bg border border-kc-border p-6 text-center">
                <div className="text-3xl font-black text-kc-teal mb-1">{stat.value}</div>
                <div className="text-sm text-kc-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad bg-kc-bg">
        <div className="container-tight">
          <h2 className="text-3xl font-black text-kc-dark mb-8 text-center">Where We Serve</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              "Kansas City, MO",
              "Overland Park, KS",
              "Dallas, TX",
              "Plano, TX",
              "Addison, TX",
              "Nationwide Online",
            ].map((city) => (
              <div key={city} className="flex items-center gap-3 bg-white border border-kc-border rounded-lg px-4 py-3">
                <MapPin className="h-4 w-4 text-kc-coral shrink-0" />
                <span className="text-sm font-medium text-kc-dark">{city}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad bg-kc-bg">
        <div className="container-tight">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-violet-card px-8 py-12 text-white text-center sm:px-12">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/[0.04] blur-2xl" />
            <div className="relative z-10">
              <h2 className="mb-4 text-3xl font-black">Get in Touch</h2>
              <p className="mx-auto mb-8 max-w-xl text-white/80">
                Have a project in mind? Call, text, or send us a message. We respond quickly.
              </p>
              <div className="mb-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a href="tel:+18165210462" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
                  <Phone className="h-4 w-4" /> (816) 521-0462
                </a>
                <a href="mailto:kansasdesigners@gmail.com" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
                  <Mail className="h-4 w-4" /> kansasdesigners@gmail.com
                </a>
              </div>
              <Button asChild className="rounded-xl bg-kc-coral hover:bg-kc-coral/90 text-white shadow-orange-glow">
                <Link href="/contact">Send a Message <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
