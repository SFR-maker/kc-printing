import type { Metadata } from "next";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Order Cancelled" };

export default function CancelPage() {
  return (
    <div className="section-pad container-tight max-w-xl text-center">
      <XCircle className="h-16 w-16 text-kc-muted mx-auto mb-6" />
      <h1 className="text-3xl font-black text-kc-dark mb-3">Order Not Completed</h1>
      <p className="text-kc-muted text-lg mb-4 leading-relaxed">
        Your order was not completed and no payment was charged. Your cart has been saved.
      </p>
      <p className="text-kc-muted text-sm mb-8">
        You can return to complete your order anytime. If you had any questions or trouble checking out, contact us at (816) 521-0462.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Button asChild className="bg-kc-coral hover:bg-kc-coral/90 text-white">
          <Link href="/services">Return to Services</Link>
        </Button>
        <Button asChild variant="outline" className="border-kc-teal text-kc-teal hover:bg-kc-teal/5">
          <Link href="/contact">Get Help</Link>
        </Button>
      </div>
    </div>
  );
}
