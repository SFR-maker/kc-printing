"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Last-resort error boundary for the whole app.
 *
 * There was none, so any unhandled render error anywhere in the tree showed Next's default error
 * screen - in production that is a blank page with no branding, no explanation and no way back.
 * A customer hitting it mid-order had no reason to believe the shop was real.
 *
 * `digest` is the server-side identifier Next assigns to the error; showing it lets someone
 * reporting the problem quote something that can actually be found in the logs, without leaking a
 * stack trace to the browser.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-20">
      <div className="max-w-md text-center">
        <p className="font-mono text-[13px] uppercase tracking-widest text-kc-dark/40">
          Something went wrong
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-kc-dark">
          We hit a problem loading this page
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-kc-muted">
          This is our fault, not yours. Nothing you were doing has been lost — try again, and if it
          keeps happening please get in touch.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="edge inline-flex h-12 items-center justify-center bg-kc-dark px-7 text-[15px] font-semibold text-white transition-colors hover:bg-kc-dark/90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="edge inline-flex h-12 items-center justify-center border border-kc-dark/20 px-7 text-[15px] font-semibold text-kc-dark transition-colors hover:border-kc-dark/40 hover:bg-kc-dark/5"
          >
            Back to the homepage
          </Link>
        </div>

        <p className="mt-10 text-sm text-kc-muted">
          Call{" "}
          <a href="tel:+18165210462" className="font-mono text-kc-dark hover:text-kc-magenta-deep">
            (816) 521-0462
          </a>{" "}
          or email{" "}
          <a href="mailto:kansasdesigners@gmail.com" className="text-kc-magenta-deep hover:text-kc-dark">
            kansasdesigners@gmail.com
          </a>
          .
        </p>

        {error.digest && (
          <p className="mt-6 font-mono text-[11px] text-kc-dark/30">Reference: {error.digest}</p>
        )}
      </div>
    </main>
  );
}
