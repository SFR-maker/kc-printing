"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle2, Sparkles, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatDollars } from "@/lib/utils";
import { calculatePrice } from "@/lib/pricing";
import { calculateBusinessCardPrice, BC_SIZES, BC_PAPERS, BC_COLORS } from "@/lib/pricing/business-cards";
import { BusinessCardPrintSpec, type BusinessCardSpec } from "@/components/builder/BusinessCardPrintSpec";
import { BrandFileUpload, type BrandFile } from "@/components/builder/BrandFileUpload";
import { AI_PALETTES, AI_PALETTE_AUTO_ID } from "@/lib/business-card/templates/ai-palettes";
import { getAnonymousToken } from "@/lib/business-card/local-autosave";
import type { ServiceDef } from "@/lib/service-data";

const bcSpecSchema = z.object({
  sizeId: z.number(),
  paperId: z.number(),
  colorId: z.number(),
  quantity: z.number(),
  rush: z.boolean(),
  roundCorners: z.boolean(),
  manualProof: z.boolean(),
});

// Cheapest real combo (100 lb. Matte Cover, 250 cards, single-sided) so the order flow opens on
// its lowest-friction, lowest-price starting point rather than nudging toward a bigger order.
const DEFAULT_BC_SPEC: BusinessCardSpec = { sizeId: 101, paperId: 7, colorId: 1, quantity: 250, rush: false, roundCorners: false, manualProof: false };

const schema = z.object({
  selectedOption: z.record(z.string(), z.string()).optional(),
  // Required for postcards/banners (checked in goNext, since it's optional here so business cards
  // — where "design it yourself" is a valid, free choice — aren't forced to pick a package).
  selectedPackage: z.string().optional(),
  selectedAddOns: z.array(z.string()),
  notes: z.string().optional(),
  businessName: z.string().min(1, "Business name is required"),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  colorPaletteId: z.string().optional(),
  brandColorsNotes: z.string().optional(),
  brandFiles: z.array(z.object({ url: z.string(), name: z.string() })),
  quantity: z.number().int("Quantity must be a whole number").min(1, "Quantity must be at least 1"),
  bcSpec: bcSpecSchema.optional(),
  // Collected at Review regardless of sign-in state, since the client has no reliable way to know
  // auth status before submitting: guests need it so there's somewhere to send confirmation and
  // print files (the API only actually requires it when the request turns out to be unauthenticated).
  guestEmail: z.string().min(1, "Email is required").email("Enter a valid email"),
});

type FormValues = z.infer<typeof schema>;

interface ProductBuilderProps {
  service: ServiceDef;
  defaultPackage?: string;
  cardDesignId?: string;
}

function draftKey(serviceSlug: string): string {
  return `kc-order-draft-${serviceSlug}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function ProductBuilder({ service, defaultPackage, cardDesignId }: ProductBuilderProps) {
  const isBusinessCards = service.slug === "business-cards";
  const STEPS = isBusinessCards ? ["Print Specs", "Design Service", "Details", "Review"] : ["Package", "Options", "Details", "Review"];
  // Which fields must be valid before advancing past each step — business cards validate the print
  // spec combo imperatively in goNext instead (its "always has a value" defaults make zod's presence
  // check meaningless), and don't use the generic quantity field at all.
  const STEP_FIELDS: (keyof FormValues)[][] = isBusinessCards
    ? [[], [], ["businessName"], []]
    : [["selectedPackage"], ["quantity"], ["businessName"], []];

  const [step, setStep] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [designMetaLoaded, setDesignMetaLoaded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(!cardDesignId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: (() => {
      if (typeof window !== "undefined") {
        const saved = window.sessionStorage.getItem(draftKey(service.slug));
        if (saved) {
          try {
            return { selectedAddOns: [], brandFiles: [], quantity: 1, bcSpec: DEFAULT_BC_SPEC, colorPaletteId: AI_PALETTE_AUTO_ID, ...JSON.parse(saved) };
          } catch {
            // fall through to plain defaults below
          }
        }
      }
      return {
        // service page "Select X" links build ?package=gold (lowercase); package names are
        // stored capitalized ("Gold"), so a case-insensitive match is required here or the
        // param silently fails to pre-select anything.
        selectedPackage: service.packages.find((p) => p.name.toLowerCase() === defaultPackage?.toLowerCase())?.name ?? "",
        selectedAddOns: [],
        brandFiles: [],
        quantity: 1,
        bcSpec: DEFAULT_BC_SPEC,
        colorPaletteId: AI_PALETTE_AUTO_ID,
      };
    })(),
  });

  const { watch, setValue, register, handleSubmit, trigger, formState: { errors } } = form;
  const values = watch();

  // Save the in-progress order to sessionStorage so a sign-in redirect (or an accidental reload)
  // doesn't throw away everything the customer just filled in.
  useEffect(() => {
    const sub = form.watch((v) => {
      window.sessionStorage.setItem(draftKey(service.slug), JSON.stringify(v));
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service.slug]);

  // If this order started from a design built with "Create with AI", that flow already collected
  // business name/contact/colors — pull them in here instead of making the customer retype
  // everything on the Details step.
  useEffect(() => {
    if (!cardDesignId) return;
    const token = getAnonymousToken();
    fetch(`/api/card-designs/${cardDesignId}?anonymousToken=${encodeURIComponent(token)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { design?: { meta?: Record<string, string> | null } } | null) => {
        const meta = data?.design?.meta;
        if (!meta) return;
        if (meta.businessName && !form.getValues("businessName")) setValue("businessName", meta.businessName);
        if (meta.phone) setValue("phone", meta.phone);
        if (meta.email) setValue("email", meta.email);
        if (meta.website) setValue("website", meta.website);
        if (meta.linkedin) setValue("linkedin", meta.linkedin);
        if (meta.colorPaletteId) setValue("colorPaletteId", meta.colorPaletteId);
        setDesignMetaLoaded(true);
        setDetailsExpanded(false);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardDesignId]);

  const selectedPkg = service.packages.find((p) => p.name === values.selectedPackage);
  const selectedAddOnPrices = (values.selectedAddOns ?? []).map((name) => {
    const ao = service.addOns.find((a) => a.name === name);
    return ao?.price ?? 0;
  });

  const bcPrice = isBusinessCards && values.bcSpec ? calculateBusinessCardPrice(values.bcSpec) : null;

  const price = isBusinessCards
    ? (bcPrice?.valid
        ? (() => {
            const total = round2(bcPrice.total + (selectedPkg?.price ?? 0) + selectedAddOnPrices.reduce((s, p) => s + p, 0));
            return { subtotal: total, discount: 0, total };
          })()
        : null)
    : selectedPkg
      ? calculatePrice({
          // Postcard/banner packages are a flat one-time design fee (see the package feature
          // lists in lib/service-data.ts — revisions, file formats, delivery time, never a
          // per-copy cost), not a per-unit print price like business cards' bcSpec. Quantity
          // here is scope/print-run metadata for the order, not a price multiplier — passing it
          // through previously made a Gold postcard order at qty 1000 come out to $69,000.
          packagePrice: selectedPkg.price,
          addOnPrices: selectedAddOnPrices,
        })
      : null;

  const selectedPaletteLabel = values.colorPaletteId && values.colorPaletteId !== AI_PALETTE_AUTO_ID
    ? AI_PALETTES.find((p) => p.id === values.colorPaletteId)?.label
    : undefined;

  const aiCopyDescription =
    service.slug === "business-cards" ? "Writes a tagline, service list, and contact line ready to paste onto your card." :
    service.slug === "postcards" ? "Writes a headline, subheadline, short body copy, and call-to-action for your postcard." :
    service.slug === "banners" ? "Writes 3 attention-grabbing headline options sized for a banner." :
    "Turns your notes into a short creative-direction summary for your designer.";

  const generateAI = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: service.slug === "business-cards" ? "card_copy" :
                service.slug === "postcards" ? "postcard_copy" :
                service.slug === "banners" ? "banner_headline" : "brief_summary",
          payload: {
            businessName: values.businessName,
            service: service.name,
            brandColors: selectedPaletteLabel ?? values.brandColorsNotes,
            notes: values.notes,
          },
        }),
      });
      if (res.status === 401) {
        setAiResult("Sign in to use the AI copy generator. Your other details on this page are saved.");
        return;
      }
      if (res.status === 429) {
        setAiResult("You've hit the hourly limit for AI generations. Try again in a bit, or describe what you'd like in the notes field above.");
        return;
      }
      const data = await res.json() as { text?: string; error?: string };
      setAiResult(data.text || "That didn't go through on our end. Try again in a moment, or describe what you'd like in the notes field above.");
    } catch {
      setAiResult("Couldn't reach the AI service. Check your connection and try again, or describe what you'd like in the notes field above.");
    } finally {
      setAiLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (data: any) => {
    const typed = data as FormValues;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: service.slug, cardDesignId, ...typed }),
      });

      const result = await res.json() as { orderId?: string; error?: string };

      if (!res.ok || !result.orderId) {
        setSubmitError(result.error ?? "Something went wrong creating your order. Please try again, or contact us at (816) 521-0462.");
        return;
      }

      const checkoutRes = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: result.orderId }),
      });

      if (!checkoutRes.ok) {
        setSubmitError("Your order was saved, but we couldn't start checkout. Please contact us at (816) 521-0462 to complete payment.");
        return;
      }

      const checkout = await checkoutRes.json() as { url?: string };
      if (!checkout.url) {
        setSubmitError("Your order was saved, but we couldn't start checkout. Please contact us at (816) 521-0462 to complete payment.");
        return;
      }

      window.sessionStorage.removeItem(draftKey(service.slug));
      window.location.href = checkout.url;
    } catch {
      setSubmitError("Something went wrong. Please check your connection and try again, or contact us at (816) 521-0462.");
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = async () => {
    if (isBusinessCards && step === 0 && !bcPrice?.valid) return;
    if (!isBusinessCards && step === 0 && !values.selectedPackage) {
      form.setError("selectedPackage", { message: "Please select a package" });
      return;
    }
    const fields = STEP_FIELDS[step];
    const valid = fields.length === 0 || (await trigger(fields));
    if (valid) setStep((s) => s + 1);
  };

  return (
    <div className="section-pad container-tight max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-kc-dark mb-2">Order {service.name}</h1>
        {cardDesignId && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-kc-coral/30 bg-kc-coral/5 px-4 py-2.5 text-sm">
            <span className="text-kc-dark">Using your custom design from the Design Studio.</span>
            <a href={`/services/${service.slug}/design/${cardDesignId}`} className="font-semibold text-kc-magenta-deep hover:underline">
              Edit design
            </a>
          </div>
        )}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => i < step && setStep(i)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                  i === step ? "bg-kc-coral text-white" :
                  i < step ? "bg-kc-coral/20 text-kc-magenta-deep cursor-pointer" :
                  "bg-kc-border text-kc-muted"
                )}
              >
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </button>
              <span className={cn("text-sm", i === step ? "font-semibold text-kc-dark" : "hidden text-kc-muted sm:block")}>{s}</span>
              {i < STEPS.length - 1 && <div className="hidden h-px w-6 bg-kc-border sm:block" />}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 0: Package (or, for business cards, real print specs priced off gotprint.com) */}
        {step === 0 && isBusinessCards && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-kc-dark">Choose Your Print Specs</h2>
            <p className="text-sm text-kc-muted">Real print pricing: size, paper, sides, and quantity all affect your price.</p>
            <BusinessCardPrintSpec spec={values.bcSpec ?? DEFAULT_BC_SPEC} onChange={(next) => setValue("bcSpec", next)} />
          </div>
        )}
        {step === 0 && !isBusinessCards && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-kc-dark">Select a Package</h2>
            {/* Boxed and given visual priority: the package pick is what actually drives price for
                this product (see the `price` calc above), so the total is shown immediately below
                it rather than waiting until the add-ons list or the footer. */}
            <div className="rounded-xl border-2 border-kc-coral/30 bg-white p-5">
              <div className={`grid grid-cols-1 gap-4 ${service.packages.length <= 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-3"}`}>
                {service.packages.map((pkg) => (
                  <button
                    key={pkg.name}
                    type="button"
                    onClick={() => setValue("selectedPackage", pkg.name)}
                    className={cn(
                      "relative rounded-xl border-2 p-5 text-left transition-all",
                      values.selectedPackage === pkg.name
                        ? "border-kc-coral bg-kc-coral/5 shadow-md"
                        : "border-kc-border bg-white hover:border-kc-coral/40"
                    )}
                  >
                    {pkg.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-kc-coral text-white border-0 text-xs">
                        Most Popular
                      </Badge>
                    )}
                    <div className="text-xs font-semibold uppercase tracking-wider text-kc-muted mb-1">{pkg.name}</div>
                    <div className="text-3xl font-black text-kc-dark mb-3">{formatDollars(pkg.price)}</div>
                    <ul className="space-y-1.5">
                      {pkg.features.slice(0, 4).map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs text-kc-muted">
                          <CheckCircle2 className="h-3.5 w-3.5 text-kc-magenta-deep shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
              {errors.selectedPackage && <p className="mt-3 text-xs text-red-500">{errors.selectedPackage.message}</p>}

              {selectedPkg && price && (
                <div className="mt-5 border-t border-kc-border pt-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-kc-muted">Package Total</div>
                      <div className="text-xs text-kc-muted">{selectedPkg.name}</div>
                    </div>
                    <div className="text-3xl font-black text-kc-magenta-deep">{formatDollars(price.total)}</div>
                  </div>
                  {selectedAddOnPrices.some((p) => p > 0) && (
                    <div className="mt-3 space-y-1 border-t border-dashed border-kc-border pt-3 text-xs text-kc-muted">
                      <div className="flex justify-between"><span>{selectedPkg.name} package</span><span>{formatDollars(selectedPkg.price)}</span></div>
                      {(values.selectedAddOns ?? []).map((name) => {
                        const ao = service.addOns.find((a) => a.name === name);
                        return ao ? <div key={name} className="flex justify-between"><span>{ao.name}</span><span>+{formatDollars(ao.price)}</span></div> : null;
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Add-ons: plain and low-key on purpose — optional extras, not a second set of
                decisions competing with the package choice above. */}
            {service.addOns.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-kc-muted">Optional add-ons</p>
                <div className="divide-y divide-kc-border overflow-hidden rounded-lg border border-kc-border">
                  {service.addOns.map((ao) => {
                    const isSelected = (values.selectedAddOns ?? []).includes(ao.name);
                    return (
                      <label key={ao.name} className="flex cursor-pointer items-center justify-between gap-3 p-3 hover:bg-kc-bg">
                        <span className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              const current = values.selectedAddOns ?? [];
                              setValue("selectedAddOns", isSelected ? current.filter((n) => n !== ao.name) : [...current, ao.name]);
                            }}
                            className="h-4 w-4 shrink-0 accent-kc-coral"
                          />
                          <span>
                            <span className="block text-sm text-kc-dark">{ao.name}</span>
                            <span className="block text-xs text-kc-muted">{ao.desc}</span>
                          </span>
                        </span>
                        {isSelected && <span className="shrink-0 text-xs text-kc-muted">+{formatDollars(ao.price)}</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Options (or, for business cards, the optional design service upsell) */}
        {step === 1 && isBusinessCards && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-kc-dark">Design Service</h2>
            <p className="text-sm text-kc-muted">Have your own artwork? Skip this: you can upload your file after checkout. Want us to design it for you? Pick a package below.</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                onClick={() => setValue("selectedPackage", "")}
                className={cn(
                  "relative rounded-xl border-2 p-5 text-left transition-all",
                  !values.selectedPackage ? "border-kc-coral bg-kc-coral/5 shadow-md" : "border-kc-border bg-white hover:border-kc-coral/40"
                )}
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-kc-muted mb-1">Self-Serve</div>
                <div className="text-3xl font-black text-kc-dark mb-3">Free</div>
                <p className="text-xs text-kc-muted">Upload your own print-ready file, or use our free design studio.</p>
              </button>
              {service.packages.map((pkg) => (
                <button
                  key={pkg.name}
                  type="button"
                  onClick={() => setValue("selectedPackage", pkg.name)}
                  className={cn(
                    "relative rounded-xl border-2 p-5 text-left transition-all",
                    values.selectedPackage === pkg.name
                      ? "border-kc-coral bg-kc-coral/5 shadow-md"
                      : "border-kc-border bg-white hover:border-kc-coral/40"
                  )}
                >
                  {pkg.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-kc-coral text-white border-0 text-xs">
                      Most Popular
                    </Badge>
                  )}
                  <div className="text-xs font-semibold uppercase tracking-wider text-kc-muted mb-1">{pkg.name}</div>
                  <div className="text-3xl font-black text-kc-dark mb-3">{formatDollars(pkg.price)}</div>
                  <ul className="space-y-1.5">
                    {pkg.features.slice(0, 4).map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-kc-muted">
                        <CheckCircle2 className="h-3.5 w-3.5 text-kc-magenta-deep shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            {service.addOns.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-kc-dark mb-3">Add-Ons (optional)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {service.addOns.map((ao) => {
                    const isSelected = (values.selectedAddOns ?? []).includes(ao.name);
                    return (
                      <button
                        key={ao.name}
                        type="button"
                        onClick={() => {
                          const current = values.selectedAddOns ?? [];
                          setValue(
                            "selectedAddOns",
                            isSelected ? current.filter((n) => n !== ao.name) : [...current, ao.name]
                          );
                        }}
                        className={cn(
                          "rounded-lg border-2 p-3 text-left transition-all",
                          isSelected ? "border-kc-coral bg-kc-coral/5" : "border-kc-border bg-white hover:border-kc-coral/40"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-kc-dark">{ao.name}</span>
                          <Badge className="bg-kc-yellow/30 text-kc-dark border-0 text-xs">+{formatDollars(ao.price)}</Badge>
                        </div>
                        <p className="text-xs text-kc-muted mt-0.5">{ao.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        {step === 1 && !isBusinessCards && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-kc-dark">Select Options</h2>
            <div className="rounded-xl border-2 border-kc-coral/30 bg-white p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {service.specs
                  .filter((s) => ["ORIENTATION", "CUSTOM"].some((t) => s.label.toUpperCase().includes(t)))
                  .map((spec) => (
                    <div key={spec.label} className="space-y-1.5 rounded-lg border border-kc-border bg-kc-bg p-3">
                      <Label>{spec.label}</Label>
                      <p className="text-sm text-kc-muted">{spec.value}</p>
                    </div>
                  ))}
                {service.specs
                  .filter((s) => {
                    const up = s.label.toUpperCase();
                    if (up.includes("CUSTOM")) return false;
                    return ["PAPER", "MATERIAL", "SIZE", "TYPE", "SHAPE"].some((t) => up.includes(t));
                  })
                  .map((spec) => {
                    // Not every matching spec is actually a clean list of discrete choices — some are
                    // prose ranges ("12x12 in up to 18x10 in depending on shape, custom sizes
                    // available") that happen to contain a comma, or a single sentence with no comma
                    // at all ("Roll-Up Stand or Vinyl Banner"). Splitting those naively produced
                    // garbage dropdown options. Only render a Select when the split genuinely yields
                    // 2+ short, non-range-sounding tokens; otherwise fall back to descriptive text.
                    const commaParts = spec.value.split(",").map((v) => v.trim()).filter(Boolean);
                    const choices = commaParts.length > 1 ? commaParts : spec.value.split(/\s+or\s+/i).map((v) => v.trim()).filter(Boolean);
                    const isCleanList = choices.length > 1 && choices.every((c) => c.length <= 35 && !/\bup to\b/i.test(c));
                    if (!isCleanList) {
                      return (
                        <div key={spec.label} className="space-y-1.5 rounded-lg border border-kc-border bg-kc-bg p-3">
                          <Label>{spec.label}</Label>
                          <p className="text-sm text-kc-muted">{spec.value}</p>
                        </div>
                      );
                    }
                    const article = /^[aeiou]/i.test(spec.label) ? "an" : "a";
                    return (
                      <div key={spec.label} className="space-y-1.5 rounded-lg border border-kc-border bg-kc-bg p-3">
                        <Label>{spec.label}</Label>
                        <Select
                          value={values.selectedOption?.[spec.label] ?? ""}
                          onValueChange={(v) => v && setValue("selectedOption", { ...values.selectedOption, [spec.label]: v })}
                        >
                          <SelectTrigger className="bg-white"><SelectValue placeholder={`Choose ${article} ${spec.label.toLowerCase().replace(/s$/, "")}`} /></SelectTrigger>
                          <SelectContent>
                            {choices.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                <div className="space-y-1.5 rounded-lg border border-kc-border bg-kc-bg p-3">
                  <Label htmlFor="quantity">Quantity / Scope</Label>
                  <Input id="quantity" type="number" min="1" {...register("quantity", { valueAsNumber: true })} className="bg-white" />
                  {errors.quantity && <p className="text-xs text-red-500">{errors.quantity.message}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-kc-dark">Project Details</h2>
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input id="businessName" placeholder="Your business name" {...register("businessName")} />
              {errors.businessName && <p className="text-xs text-red-500">{errors.businessName.message}</p>}
            </div>

            {designMetaLoaded && !detailsExpanded ? (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-kc-coral/30 bg-kc-coral/5 p-4">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-kc-magenta-deep" />
                  <div className="text-sm">
                    <p className="font-medium text-kc-dark">Using contact info &amp; colors from your design</p>
                    <p className="mt-0.5 text-xs text-kc-muted">
                      {[values.phone, values.email, values.website].filter(Boolean).join(" · ") || "No contact info was set."}
                      {selectedPaletteLabel ? ` · ${selectedPaletteLabel} palette` : ""}
                    </p>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setDetailsExpanded(true)} className="border-kc-border shrink-0">
                  Edit
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-kc-muted">Contact Info for Design (optional)</Label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input placeholder="Phone" {...register("phone")} />
                    <Input placeholder="Email" {...register("email")} />
                    <Input placeholder="Website" {...register("website")} />
                    <Input placeholder="LinkedIn (optional)" {...register("linkedin")} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-kc-muted">Brand Colors (optional)</Label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setValue("colorPaletteId", AI_PALETTE_AUTO_ID)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-colors",
                        (values.colorPaletteId ?? AI_PALETTE_AUTO_ID) === AI_PALETTE_AUTO_ID
                          ? "border-kc-coral bg-kc-coral/10 text-kc-magenta-deep"
                          : "border-kc-border text-kc-muted hover:border-kc-coral/40"
                      )}
                    >
                      <Sparkles className="h-3 w-3" /> Surprise Me
                    </button>
                    {AI_PALETTES.map((p) => {
                      const active = values.colorPaletteId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          title={p.label}
                          onClick={() => setValue("colorPaletteId", p.id)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1.5 text-xs font-medium transition-colors",
                            active ? "border-kc-dark bg-kc-bg" : "border-kc-border hover:border-kc-dark/40"
                          )}
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
                  <Input placeholder="Or describe custom colors, e.g. Navy blue #173B64, Gold #FFDE70" {...register("brandColorsNotes")} className="mt-1" />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Project Notes</Label>
              <Textarea
                id="notes"
                placeholder="Describe your vision, style preferences, any must-have elements, or inspiration..."
                rows={4}
                {...register("notes")}
              />
            </div>

            <div className="rounded-xl border-2 border-kc-coral/20 bg-gradient-to-br from-kc-coral/5 to-kc-yellow/5 p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-kc-coral/15">
                    <Sparkles className="h-4.5 w-4.5 text-kc-magenta-deep" />
                  </div>
                  <div>
                    <span className="block font-semibold text-kc-dark text-sm">AI Copy Generator</span>
                    <span className="block text-xs text-kc-muted">{aiCopyDescription}</span>
                  </div>
                </div>
                <Button type="button" onClick={generateAI} disabled={aiLoading || !values.businessName}
                  className="bg-kc-coral text-white hover:bg-kc-coral/90 disabled:bg-kc-coral/30 disabled:text-white disabled:opacity-100">
                  {aiLoading ? (
                    <span className="flex items-center gap-2">Generating…</span>
                  ) : (
                    <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Generate Ideas</span>
                  )}
                </Button>
              </div>
              {aiResult && (
                <div className="rounded-lg border border-kc-border bg-white p-4 text-sm text-kc-dark whitespace-pre-wrap shadow-sm">
                  {aiResult}
                </div>
              )}
              {!aiResult && !aiLoading && (
                <p className="text-xs text-kc-muted">
                  {values.businessName
                    ? "Uses your business name, notes, and brand colors above. Click “Generate Ideas” and copy anything useful into the notes field."
                    : "Enter your business name above, then click “Generate Ideas” to get AI-written copy for this project."}
                </p>
              )}
            </div>

            <BrandFileUpload
              value={values.brandFiles ?? []}
              onChange={(files: BrandFile[]) => setValue("brandFiles", files)}
            />
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-kc-dark">Order Review</h2>
            <Card className="border-kc-border">
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-kc-muted">Service</span>
                  <span className="font-medium text-kc-dark">{service.name}</span>
                </div>
                {isBusinessCards && values.bcSpec && bcPrice?.valid && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-kc-muted">Size</span>
                      <span className="font-medium text-kc-dark">{BC_SIZES.find((s) => s.id === values.bcSpec!.sizeId)?.label}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-kc-muted">Paper</span>
                      <span className="font-medium text-kc-dark">{BC_PAPERS.find((p) => p.id === values.bcSpec!.paperId)?.label}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-kc-muted">Sides</span>
                      <span className="font-medium text-kc-dark">{BC_COLORS.find((c) => c.id === values.bcSpec!.colorId)?.label}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-kc-muted">Quantity</span>
                      <span className="font-medium text-kc-dark">{values.bcSpec.quantity.toLocaleString("en-US")} cards</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-kc-muted">Printing</span>
                      <span className="font-medium text-kc-dark">{formatDollars(bcPrice.total)}</span>
                    </div>
                  </>
                )}
                {values.selectedPackage && (
                  <div className="flex justify-between text-sm">
                    <span className="text-kc-muted">{isBusinessCards ? "Design Service" : "Package"}</span>
                    <span className="font-medium text-kc-dark">{values.selectedPackage} - {formatDollars(selectedPkg?.price ?? 0)}</span>
                  </div>
                )}
                {isBusinessCards && !values.selectedPackage && (
                  <div className="flex justify-between text-sm">
                    <span className="text-kc-muted">Design Service</span>
                    <span className="font-medium text-kc-dark">Self-serve (free)</span>
                  </div>
                )}
                {(values.selectedAddOns ?? []).length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-kc-muted">Add-Ons</span>
                    <span className="font-medium text-kc-dark">{(values.selectedAddOns ?? []).join(", ")}</span>
                  </div>
                )}
                {Object.entries(values.selectedOption ?? {}).map(([label, val]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-kc-muted">{label}</span>
                    <span className="font-medium text-kc-dark">{val}</span>
                  </div>
                ))}
                {values.quantity > 1 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-kc-muted">Quantity</span>
                    <span className="font-medium text-kc-dark">{values.quantity}</span>
                  </div>
                )}
                {values.businessName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-kc-muted">Business Name</span>
                    <span className="font-medium text-kc-dark">{values.businessName}</span>
                  </div>
                )}
                {[values.phone, values.email, values.website, values.linkedin].some(Boolean) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-kc-muted">Contact Info</span>
                    <span className="font-medium text-kc-dark text-right">
                      {[values.phone, values.email, values.website, values.linkedin].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                )}
                {(selectedPaletteLabel || values.brandColorsNotes) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-kc-muted">Brand Colors</span>
                    <span className="font-medium text-kc-dark text-right">{selectedPaletteLabel ?? values.brandColorsNotes}</span>
                  </div>
                )}
                {values.notes && (
                  <div className="text-sm">
                    <span className="text-kc-muted">Notes</span>
                    <p className="mt-1 font-medium text-kc-dark">{values.notes}</p>
                  </div>
                )}
                {values.brandFiles && values.brandFiles.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-kc-muted">Brand Files</span>
                    <span className="font-medium text-kc-dark text-right">
                      {values.brandFiles.length} file{values.brandFiles.length === 1 ? "" : "s"} attached
                    </span>
                  </div>
                )}
                <div className="border-t border-kc-border pt-3 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-kc-magenta-deep text-lg">{price ? formatDollars(price.total) : "--"}</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="guestEmail">Email for order confirmation *</Label>
              <Input id="guestEmail" type="email" placeholder="you@example.com" {...register("guestEmail")} />
              <p className="text-xs text-kc-muted">
                We&apos;ll send your receipt and print files here. You don&apos;t need an account to order, only to save designs or use AI generation.
              </p>
              {errors.guestEmail && <p className="text-xs text-red-500">{errors.guestEmail.message}</p>}
            </div>

            {submitError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between border-t border-kc-border pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="border-kc-border"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>

          {price && (
            <div className="text-center">
              <div className="text-xs text-kc-muted">Estimated Total</div>
              <div className="text-xl font-black text-kc-magenta-deep">{formatDollars(price.total)}</div>
            </div>
          )}

          {step < STEPS.length - 1 ? (
            <Button
              key="next-button"
              type="button"
              onClick={goNext}
              className="bg-kc-coral hover:bg-kc-coral/90 text-white"
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              key="submit-button"
              type="submit"
              disabled={submitting}
              className="bg-kc-coral hover:bg-kc-coral/90 text-white"
            >
              {submitting ? "Processing..." : "Proceed to Payment"}
              {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
