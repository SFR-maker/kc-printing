import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Phone, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About KC Printing - Online Design Studio",
  description:
    "KC Printing is a fully online design studio serving Kansas City, Dallas, Plano, Addison, Overland Park, and businesses nationwide. Fast, professional, print-ready.",
};

// Real, verifiable facts only — no client counts, ratings, or years-in-business claims until
// there's real data to back them.
const FACTS = [
  { value: "3", label: "Design services" },
  { value: "24hr", label: "Rush turnaround available" },
  { value: "8", label: "Max revisions per order" },
  { value: "100%", label: "Online, no in-person visit needed" },
];

export default function AboutPage() {
  return (
    <div>
      <section className="section-pad-tight bg-kc-bg">
        <div className="container-tight max-w-2xl">
          <h1 className="mb-6 text-4xl font-black tracking-tight text-kc-dark sm:text-5xl">A design studio built for the modern business owner</h1>
          <p className="text-lg leading-relaxed text-kc-muted">
            KC Printing is a fully online print and design studio based in Kansas City, MO. We help small and mid-size businesses get professional design work done fast, at a fair price, without the overhead of a traditional agency.
          </p>
        </div>
      </section>

      <section className="section-pad bg-white">
        <div className="container-tight grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-3xl font-black text-kc-dark">What we do</h2>
            <p className="mb-4 leading-relaxed text-kc-muted">
              We specialize in three things and do them well: business cards, postcards, and banners. Every order is handled by a real designer who cares about your brand.
            </p>
            <p className="mb-4 leading-relaxed text-kc-muted">
              We use AI tools to speed up the early creative process, but every design is reviewed and refined by a human before it reaches you.
            </p>
            <p className="leading-relaxed text-kc-muted">
              All file delivery is digital. We&apos;re a fully online studio, so we serve businesses anywhere in the United States while keeping our roots in Kansas City.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {FACTS.map((fact) => (
              <div key={fact.label} className="rounded-md border border-kc-border bg-kc-bg p-6 text-center">
                <div className="mb-1 text-3xl font-black text-kc-teal">{fact.value}</div>
                <div className="text-sm text-kc-muted">{fact.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad bg-kc-bg">
        <div className="container-tight">
          <h2 className="mb-8 text-center text-3xl font-black text-kc-dark">Where we serve</h2>
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {["Kansas City, MO", "Overland Park, KS", "Dallas, TX", "Plano, TX", "Addison, TX", "Nationwide Online"].map((city) => (
              <div key={city} className="flex items-center gap-3 rounded-md border border-kc-border bg-white px-4 py-3">
                <MapPin className="h-4 w-4 shrink-0 text-kc-coral" />
                <span className="text-sm font-medium text-kc-dark">{city}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-kc-teal">
        <div className="container-tight px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
          <h2 className="mb-4 text-3xl font-black text-white">Get in touch</h2>
          <p className="mx-auto mb-8 max-w-xl text-white/80">
            Have a project in mind? Call, text, or send us a message. We respond quickly.
          </p>
          <div className="mb-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="tel:+18165210462" className="flex items-center gap-2 text-white/80 transition-colors hover:text-white">
              <Phone className="h-4 w-4" /> (816) 521-0462
            </a>
            <a href="mailto:kansasdesigners@gmail.com" className="flex items-center gap-2 text-white/80 transition-colors hover:text-white">
              <Mail className="h-4 w-4" /> kansasdesigners@gmail.com
            </a>
          </div>
          <Button asChild size="lg" className="rounded-md bg-kc-coral px-8 text-white hover:bg-kc-coral/90">
            <Link href="/contact">Send a Message <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
