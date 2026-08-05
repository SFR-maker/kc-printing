import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Page not found",
  // A 404 that gets indexed competes with the pages that should rank.
  robots: { index: false, follow: true },
};

/**
 * Branded 404.
 *
 * Without this file Next serves its own black-and-white "404: This page could not be found", which
 * has no header, no footer and no way back into the site - a dead end for anyone who mistyped a URL
 * or followed a stale link, and nothing to suggest they had reached a real business.
 */
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="section-pad container-tight max-w-xl text-center">
        <p className="font-mono text-[13.91px] uppercase tracking-widest text-kc-dark/40">Error 404</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-kc-dark">
          That page isn&apos;t here
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[16.05px] leading-relaxed text-kc-muted">
          The link may be out of date, or the address may have a typo in it. Everything we print is
          one click away below.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/services"
            className="edge inline-flex h-12 items-center justify-center bg-kc-dark px-7 text-[16.05px] font-semibold text-white transition-colors hover:bg-kc-dark/90"
          >
            Browse what we print
          </Link>
          <Link
            href="/"
            className="edge inline-flex h-12 items-center justify-center border border-kc-dark/20 px-7 text-[16.05px] font-semibold text-kc-dark transition-colors hover:border-kc-dark/40 hover:bg-kc-dark/5"
          >
            Back to the homepage
          </Link>
        </div>

        <p className="mt-10 text-sm text-kc-muted">
          Looking for something specific?{" "}
          <Link href="/contact" className="font-semibold text-kc-magenta-deep hover:text-kc-dark">
            Ask us
          </Link>{" "}
          or call{" "}
          <a href="tel:+18165210462" className="font-mono text-kc-dark hover:text-kc-magenta-deep">
            (816) 521-0462
          </a>
          .
        </p>
      </main>
      <Footer />
    </>
  );
}
