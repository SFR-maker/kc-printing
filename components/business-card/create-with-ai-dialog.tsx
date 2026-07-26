"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRODUCT_ROUTE_SEGMENT, type DesignProduct } from "@/lib/business-card/print-spec";
import { AI_PALETTES, AI_PALETTE_AUTO_ID } from "@/lib/business-card/templates/ai-palettes";
import { renderSideToSvg } from "@/lib/business-card/render-svg";
import type { CardSide } from "@/lib/business-card/schema";

interface FormState {
  businessName: string;
  tagline: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  linkedin: string;
  address: string;
  colorPaletteId: string;
  includeQrCode: boolean;
  bannerFormat: "rollup" | "vinyl";
}

const EMPTY_FORM: FormState = {
  businessName: "", tagline: "", description: "", phone: "", email: "", website: "", linkedin: "", address: "",
  colorPaletteId: AI_PALETTE_AUTO_ID, includeQrCode: false, bannerFormat: "vinyl",
};

interface PreviewData {
  designId: string;
  front: CardSide;
}

export function CreateWithAiDialog({ product }: { product: DesignProduct }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "signin" | "loading" | "preview" | "error" | "limit">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/ai-design")
      .then((res) => res.json())
      .then((data) => {
        if (data.requiresSignIn) {
          setStatus("signin");
          return;
        }
        setRemaining(data.remaining ?? 0);
      })
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
        body: JSON.stringify({ product, ...form }),
      });
      if (res.status === 401) {
        setStatus("signin");
        return;
      }
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
      setRemaining(data.remaining ?? 0);
      setPreview({ designId: data.designId, front: data.front });
      setStatus("preview");
    } catch {
      setStatus("error");
      setErrorMessage("Something went wrong generating your design. Please try again.");
    }
  }

  function openEditor() {
    if (!preview) return;
    router.push(`/services/${PRODUCT_ROUTE_SEGMENT[product]}/design/${preview.designId}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setStatus("idle");
          setForm(EMPTY_FORM);
          setPreview(null);
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

      <DialogContent className={status === "preview" ? "max-w-xl" : "max-w-lg"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-kc-orange" /> Create with AI</DialogTitle>
          {status !== "preview" && status !== "signin" && (
            <DialogDescription>
              Tell us about your business and we&apos;ll generate a custom design, background art included.
              {remaining !== null && <span className="mt-1 block font-medium text-kc-dark">{remaining} free AI design{remaining === 1 ? "" : "s"} remaining.</span>}
            </DialogDescription>
          )}
        </DialogHeader>

        {status === "signin" ? (
          <div className="space-y-3">
            <p className="text-sm text-kc-muted">
              AI design generation is a free account perk. Sign in (or create a free account) to get 3 AI-generated designs, no strings attached. You can still browse templates and order without an account.
            </p>
            <Button asChild className="w-full bg-kc-orange text-white hover:bg-kc-orange/90">
              <a href={`/sign-in?redirect_url=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`}>
                Sign In to Use AI
              </a>
            </Button>
          </div>
        ) : status === "limit" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            You&apos;ve used all your free AI designs. Browse our template gallery to keep designing, or contact us for more.
          </div>
        ) : status === "preview" && preview ? (
          <AiPreview front={preview.front} />
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
                placeholder="Boutique real estate agency in Kansas City specializing in family homes: warm, trustworthy, upscale feel"
                rows={2}
              />
              <p className="text-xs text-kc-muted">Used to generate your background art. The more descriptive, the better.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Color Palette</Label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, colorPaletteId: AI_PALETTE_AUTO_ID })}
                  className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-colors ${form.colorPaletteId === AI_PALETTE_AUTO_ID ? "border-kc-orange bg-kc-orange/10 text-kc-orange" : "border-kc-border text-kc-muted hover:border-kc-orange/40"}`}
                >
                  <Sparkles className="h-3 w-3" /> Surprise Me
                </button>
                {AI_PALETTES.map((p) => {
                  const active = form.colorPaletteId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      title={p.label}
                      onClick={() => setForm({ ...form, colorPaletteId: p.id })}
                      className={`flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1.5 text-xs font-medium transition-colors ${active ? "border-kc-dark bg-kc-bg" : "border-kc-border hover:border-kc-dark/40"}`}
                    >
                      <span className="flex -space-x-1">
                        {p.colors.map((c, i) => (
                          <span key={i} className="h-3.5 w-3.5 rounded-full border border-white" style={{ backgroundColor: c }} />
                        ))}
                      </span>
                      {active && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-kc-muted">Contact Info</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="(816) 555-0100" className={!form.phone.trim() ? "border-kc-orange/40" : ""} />
                  <span className="pl-0.5 text-[11px] text-kc-muted">Phone *</span>
                </div>
                <div className="space-y-1">
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@business.com" />
                  <span className="pl-0.5 text-[11px] text-kc-muted">Email</span>
                </div>
                <div className="space-y-1">
                  <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="yourbusiness.com" />
                  <span className="pl-0.5 text-[11px] text-kc-muted">Website</span>
                </div>
                <div className="space-y-1">
                  <Input value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} placeholder="linkedin.com/in/you" />
                  <span className="pl-0.5 text-[11px] text-kc-muted">LinkedIn (optional)</span>
                </div>
                <div className="col-span-2 space-y-1">
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St, Kansas City, MO" />
                  <span className="pl-0.5 text-[11px] text-kc-muted">Address (optional)</span>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2.5 rounded-lg border border-kc-border p-3 text-sm">
              <input type="checkbox" checked={form.includeQrCode} onChange={(e) => setForm({ ...form, includeQrCode: e.target.checked })} className="h-4 w-4 shrink-0" />
              <span>
                <span className="font-medium text-kc-dark">Include a QR code</span>
                <span className="block text-xs text-kc-muted">Links to your website (or contact info if no website is given).</span>
              </span>
            </label>

            {product === "banner" && (
              <div className="space-y-1.5">
                <Label>Banner Format</Label>
                <Select value={form.bannerFormat} onValueChange={(v) => v && setForm({ ...form, bannerFormat: v as "rollup" | "vinyl" })}>
                  <SelectTrigger><SelectValue>{(v: string) => (v === "rollup" ? "Roll-Up Stand (tall, 33x81in)" : "Vinyl Banner (wide, 8ft)")}</SelectValue></SelectTrigger>
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

        <DialogFooter className={status !== "preview" && status !== "limit" ? "flex-col items-stretch sm:flex-col sm:items-end" : undefined}>
          {status === "preview" ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setOpen(false)} className="border-kc-border">Close</Button>
              <Button onClick={openEditor} className="bg-kc-orange text-white hover:bg-kc-orange/90">Open in Editor</Button>
            </div>
          ) : (
            <>
              {status !== "limit" && !canSubmit && status !== "loading" && (
                <p className="text-right text-xs text-kc-muted">
                  {[!form.businessName.trim() && "business name", !form.description.trim() && "description", !form.phone.trim() && "phone"]
                    .filter(Boolean)
                    .join(", ")} required to generate
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setOpen(false)} className="border-kc-border">Cancel</Button>
                {status !== "limit" && (
                  <Button onClick={handleSubmit} disabled={!canSubmit || status === "loading"}
                    className="bg-kc-orange text-white hover:bg-kc-orange/90 disabled:bg-kc-orange/30 disabled:text-white disabled:opacity-100">
                    {status === "loading" ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Generating…</span>
                    ) : (
                      <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Generate My Design</span>
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AiPreview({ front }: { front: CardSide }) {
  const svg = renderSideToSvg(front, 72);
  return (
    <div className="space-y-2">
      <p className="text-sm text-kc-muted">Here&apos;s your AI-generated design. Open it in the editor to fine-tune anything before ordering.</p>
      <div className="overflow-hidden rounded-xl border border-kc-border [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
