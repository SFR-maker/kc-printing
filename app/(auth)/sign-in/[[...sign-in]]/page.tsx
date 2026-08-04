import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your 611 Printing account to track orders, download files and reorder.",
  // An auth screen has nothing to rank for and competes with the pages that do.
  robots: { index: false, follow: true },
};

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-kc-bg flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-kc-teal mb-4">
            <span className="text-xl font-black text-kc-coral">KC</span>
          </div>
          <p className="text-2xl font-black text-kc-dark">Welcome back</p>
          <p className="text-kc-muted text-sm mt-1">Sign in to your 611 Printing account</p>
        </div>
        <SignIn />
      </div>
    </main>
  );
}
