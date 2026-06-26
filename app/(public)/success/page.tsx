import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Order Confirmed" };

export default function SuccessPage() {
  return (
    <div className="section-pad container-tight max-w-xl text-center">
      <CheckCircle2 className="h-16 w-16 text-kc-teal mx-auto mb-6" />
      <h1 className="text-3xl font-black text-kc-dark mb-3">Order Confirmed</h1>
      <p className="text-kc-muted text-lg mb-4 leading-relaxed">
        Your order has been received and payment was processed successfully. Our design team will begin work shortly.
      </p>
      <p className="text-kc-muted text-sm mb-8">
        You will receive a confirmation email and can track your order status in your account dashboard.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Button asChild className="bg-kc-teal hover:bg-kc-teal/90 text-white">
          <Link href="/account/orders">View My Orders</Link>
        </Button>
        <Button asChild variant="outline" className="border-kc-teal text-kc-teal hover:bg-kc-teal/5">
          <Link href="/services">Order Another Service</Link>
        </Button>
      </div>
    </div>
  );
}
