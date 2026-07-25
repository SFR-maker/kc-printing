"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAnonymousToken } from "@/lib/business-card/local-autosave";
import { PRODUCT_ROUTE_SEGMENT, type DesignProduct } from "@/lib/business-card/print-spec";

interface FormState {
  businessName: string;
  tagline: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  bannerFormat: "rollup" | "vinyl";
}

const EMPTY_FORM: FormState = { businessName: "", tagline: "", description: "", phone: "", email: "", website: "", address: "", bannerFormat: "vinyl" };

export function CreateWithAiDialog({ product }: { product: DesignProduct }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "limit">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    const token = getAnonymousToken();
    fetch(`/api/ai-design?anonymousToken=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => setRemaining(data.remaining ?? 0))
      .catch(() => setRemaining(null));
  }, [open]);

  const canSubmit = form.businessName.trim() && form.description.trim() && form.phone.trim() && (remaining ?? 1) > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/ai-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, anonymousToken: getAnonymousToken(), ...form }),
      });
      if (res.status === 429) {
        setStatus("limit");
        setRemaining(0);
        return;
      }
      if (!res.ok) {
        setStatus("error");
        setErrorMessage("Something went wrong generating your design. Please try again.");
        return;
      }
      const data = await res.json();
      router.push(`/services/${PRODUCT_ROUTE_SEGMENT[product]}/design/${data.designId}`);
    } catch {
      setStatus("error");
      setErrorMessage("Something went wrong generating your design. Please try again.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setStatus("idle");
          setForm(EMPTY_FORM);
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-kc-orange/50 bg-kc-orange/5 px-6 py-5 text-sm font-semibold text-kc-orange transition-colors hover:bg-kc-orange/10"
      >
        <Sparkles className="h-4 w-4" /> Create with AI
      </button>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-kc-orange" /> Create with AI</DialogTitle>
          <DialogDescription>
            Tell us about your business and we&apos;ll generate a custom design — background art included.
            {remaining !== null && <span className="mt-1 block font-medium text-kc-dark">{remaining} free AI design{remaining === 1 ? "" : "s"} remaining.</span>}
          </DialogDescription>
        </DialogHeader>

        {status === "limit" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            You&apos;ve used all your free AI designs. Browse our template gallery to keep designing, or contact us for more.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Business Name *</Label>
                <Input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="Whitfield & Co. Realty" />
              </div>
              <div className="space-y-1.5">
                <Label>Tagline</Label>
                <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Now Booking" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>What does your business do? *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Boutique real estate agency in Kansas City specializing in family homes — warm, trustworthy, upscale feel"
                rows={2}
              />
              <p className="text-xs text-kc-muted">Used to generate your background art — the more descriptive, the better.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(816) 555-0142" />
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="hello@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St, Kansas City, MO" />
              </div>
            </div>

            {product === "banner" && (
              <div className="space-y-1.5">
                <Label>Banner Format</Label>
                <Select value={form.bannerFormat} onValueChange={(v) => v && setForm({ ...form, bannerFormat: v as "rollup" | "vinyl" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vinyl">Vinyl Banner (wide, 8ft)</SelectItem>
                    <SelectItem value="rollup">Roll-Up Stand (tall, 33x81in)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {status === "error" && <p className="text-xs text-red-500">{errorMessage}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="border-kc-border">Cancel</Button>
          {status !== "limit" && (
            <Button onClick={handleSubmit} disabled={!canSubmit || status === "loading"} className="bg-kc-orange text-white hover:bg-kc-orange/90">
              {status === "loading" ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Generating…</span>
              ) : (
                "Generate My Design"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
