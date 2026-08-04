import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a 611 Printing account to track orders, download print-ready files and reorder in one click.",
  // An auth screen has nothing to rank for and competes with the pages that do.
  robots: { index: false, follow: true },
};

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-kc-bg flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-kc-teal mb-4">
            <span className="text-xl font-black text-kc-coral">KC</span>
          </div>
          <p className="text-2xl font-black text-kc-dark">Create your account</p>
          <p className="text-kc-muted text-sm mt-1">Start ordering from 611 Printing today</p>
        </div>
        <SignUp />
      </div>
    </main>
  );
}
