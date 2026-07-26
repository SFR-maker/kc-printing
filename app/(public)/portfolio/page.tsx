import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { PortfolioGrid } from "@/components/portfolio/portfolio-grid";

export const metadata: Metadata = {
  title: "Design Portfolio",
  description:
    "Sample styles for KC Printing business card, postcard, and banner design work — Kansas City and nationwide.",
};

export default function PortfolioPage() {
  return (
    <div>
      <div className="section-pad-tight bg-kc-bg">
        <div className="container-tight max-w-2xl">
          <h1 className="mb-3 text-4xl font-black tracking-tight text-kc-dark sm:text-5xl">Style samples</h1>
          <p className="text-lg text-kc-muted">
            A few of the directions we design in. Every project is built from scratch for the business ordering it — nothing here is a template.
          </p>
        </div>
      </div>

      <div className="container-tight px-4 py-12 sm:px-6 lg:px-8">
        <PortfolioGrid />

        <div className="mt-14 flex flex-col items-start justify-between gap-6 rounded-md border border-kc-border bg-kc-violet-tint p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="mb-1.5 text-xl font-bold text-kc-dark">Want to see real project files?</h2>
            <p className="text-sm text-kc-muted">Ask and we&apos;ll share examples relevant to your industry.</p>
          </div>
          <Button asChild className="shrink-0 rounded-md bg-kc-coral text-white hover:bg-kc-coral/90">
            <Link href="/contact">Request Samples <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
