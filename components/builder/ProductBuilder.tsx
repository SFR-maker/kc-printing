"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle2, Sparkles, Upload, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatDollars } from "@/lib/utils";
import { calculatePrice } from "@/lib/pricing";
import type { ServiceDef } from "@/lib/service-data";

// Baked in at build time, same pattern as components/layout/Header.tsx — lets us know whether a
// signed-in check is even possible without calling Clerk hooks outside a ClerkProvider.
const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const schema = z.object({
  selectedOption: z.record(z.string(), z.string()).optional(),
  selectedPackage: z.string().min(1, "Please select a package"),
  selectedAddOns: z.array(z.string()),
  notes: z.string().optional(),
  businessName: z.string().min(1, "Business name is required"),
  contactInfo: z.string().optional(),
  brandColors: z.string().optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

type FormValues = z.infer<typeof schema>;

interface ProductBuilderProps {
  service: ServiceDef;
  defaultPackage?: string;
  cardDesignId?: string;
}

const STEPS = ["Package", "Options", "Details", "Review"];

// Which fields must be valid before advancing past each step — the wizard used to let you skip
// straight to Review with nothing filled in, since "Next" never checked anything.
const STEP_FIELDS: (keyof FormValues)[][] = [
  ["selectedPackage"],
  ["quantity"],
  ["businessName"],
  [],
];

function draftKey(serviceSlug: string): string {
  return `kc-order-draft-${serviceSlug}`;
}

export function ProductBuilder({ service, defaultPackage, cardDesignId }: ProductBuilderProps) {
  const [step, setStep] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: (() => {
      if (typeof window !== "undefined") {
        const saved = window.sessionStorage.getItem(draftKey(service.slug));
        if (saved) {
          try {
            return { selectedAddOns: [], quantity: 1, ...JSON.parse(saved) };
          } catch {
            // fall through to plain defaults below
          }
        }
      }
      return {
        selectedPackage: defaultPackage ?? "",
        selectedAddOns: [],
        quantity: 1,
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

  const selectedPkg = service.packages.find((p) => p.name === values.selectedPackage);
  const selectedAddOnPrices = (values.selectedAddOns ?? []).map((name) => {
    const ao = service.addOns.find((a) => a.name === name);
    return ao?.price ?? 0;
  });

  const price = selectedPkg
    ? calculatePrice({
        packagePrice: selectedPkg.price,
        addOnPrices: selectedAddOnPrices,
        quantity: values.quantity,
      })
    : null;

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
            brandColors: values.brandColors,
            notes: values.notes,
          },
        }),
      });
      const data = await res.json() as { text?: string; error?: string };
      setAiResult(data.text ?? "");
    } catch {
      setAiResult("AI is temporarily unavailable. Please describe your requirements in the notes field.");
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

      if (res.status === 401) {
        setSubmitError(
          "You'll need to sign in to complete your order — your details are saved, so nothing will be lost. Sign in and come back to this page to finish checking out."
        );
        return;
      }

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
    const fields = STEP_FIELDS[step];
    const valid = fields.length === 0 || (await trigger(fields));
    if (valid) setStep((s) => s + 1);
  };

  return (
    <div className="section-pad container-tight max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-kc-dark mb-2">Order {service.name}</h1>
        {cardDesignId && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-kc-teal/30 bg-kc-teal/5 px-4 py-2.5 text-sm">
            <span className="text-kc-dark">Using your custom design from the Design Studio.</span>
            <a href={`/services/business-cards/design/${cardDesignId}`} className="font-semibold text-kc-teal hover:underline">
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
                  i === step ? "bg-kc-teal text-white" :
                  i < step ? "bg-kc-teal/20 text-kc-teal cursor-pointer" :
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
        {/* Step 0: Package */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-kc-dark">Select a Package</h2>
            <div className={`grid grid-cols-1 gap-4 ${service.packages.length <= 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-3"}`}>
              {service.packages.map((pkg) => (
                <button
                  key={pkg.name}
                  type="button"
                  onClick={() => setValue("selectedPackage", pkg.name)}
                  className={cn(
                    "relative rounded-xl border-2 p-5 text-left transition-all",
                    values.selectedPackage === pkg.name
                      ? "border-kc-teal bg-kc-teal/5 shadow-md"
                      : "border-kc-border bg-white hover:border-kc-teal/40"
                  )}
                >
                  {pkg.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-kc-teal text-white border-0 text-xs">
                      Most Popular
                    </Badge>
                  )}
                  <div className="text-xs font-semibold uppercase tracking-wider text-kc-muted mb-1">{pkg.name}</div>
                  <div className="text-3xl font-black text-kc-dark mb-3">{formatDollars(pkg.price)}</div>
                  <ul className="space-y-1.5">
                    {pkg.features.slice(0, 4).map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-kc-muted">
                        <CheckCircle2 className="h-3.5 w-3.5 text-kc-teal shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
            {errors.selectedPackage && <p className="text-xs text-red-500">{errors.selectedPackage.message}</p>}

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

        {/* Step 1: Options */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-kc-dark">Select Options</h2>
            {service.specs
              .filter((s) => ["SIZE", "ORIENTATION"].some((t) => s.label.toUpperCase().includes(t)))
              .map((spec) => (
                <div key={spec.label} className="space-y-2">
                  <Label>{spec.label}</Label>
                  <p className="text-sm text-kc-muted">{spec.value}</p>
                </div>
              ))}
            {service.specs
              .filter((s) => ["PAPER", "MATERIAL"].some((t) => s.label.toUpperCase().includes(t)))
              .map((spec) => {
                const choices = spec.value.split(",").map((v) => v.trim()).filter(Boolean);
                return (
                  <div key={spec.label} className="space-y-2">
                    <Label>{spec.label}</Label>
                    <Select
                      value={values.selectedOption?.[spec.label] ?? ""}
                      onValueChange={(v) => v && setValue("selectedOption", { ...values.selectedOption, [spec.label]: v })}
                    >
                      <SelectTrigger className="max-w-sm">
                        <SelectValue placeholder={`Choose a ${spec.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {choices.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity / Scope</Label>
              <Input id="quantity" type="number" min="1" {...register("quantity", { valueAsNumber: true })} className="max-w-xs" />
              {errors.quantity && <p className="text-xs text-red-500">{errors.quantity.message}</p>}
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
            <div className="space-y-2">
              <Label htmlFor="contactInfo">Contact Info for Design (optional)</Label>
              <Input id="contactInfo" placeholder="Phone, email, website to include in design" {...register("contactInfo")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandColors">Brand Colors (optional)</Label>
              <Input id="brandColors" placeholder="e.g., Navy blue #173B64, Gold #FFDE70" {...register("brandColors")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Project Notes</Label>
              <Textarea
                id="notes"
                placeholder="Describe your vision, style preferences, any must-have elements, or inspiration..."
                rows={4}
                {...register("notes")}
              />
            </div>

            <div className="border border-kc-border rounded-xl p-4 bg-kc-bg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-kc-teal" />
                  <span className="font-semibold text-kc-dark text-sm">AI Copy Generator</span>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={generateAI} disabled={aiLoading || !values.businessName}
                  className="border-kc-teal text-kc-teal hover:bg-kc-teal/5">
                  {aiLoading ? "Generating..." : "Generate Ideas"}
                </Button>
              </div>
              {aiResult && (
                <div className="text-xs text-kc-muted bg-white border border-kc-border rounded-lg p-3 whitespace-pre-wrap">
                  {aiResult}
                </div>
              )}
              {!aiResult && <p className="text-xs text-kc-muted">Enter your business name above to generate AI copy suggestions.</p>}
            </div>

            <div className="border-2 border-dashed border-kc-border rounded-xl p-6 text-center">
              <Upload className="h-8 w-8 text-kc-muted mx-auto mb-2" />
              <p className="text-sm font-medium text-kc-dark mb-1">Upload Brand Files</p>
              <p className="text-xs text-kc-muted">TIF, TIFF, EPS, AI, PSD, BMP, GIF, JPG, PNG, PDF up to 50MB</p>
              <p className="text-xs text-kc-muted mt-1">File upload available in your account dashboard after order</p>
            </div>
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
                {values.selectedPackage && (
                  <div className="flex justify-between text-sm">
                    <span className="text-kc-muted">Package</span>
                    <span className="font-medium text-kc-dark">{values.selectedPackage} - {formatDollars(selectedPkg?.price ?? 0)}</span>
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
                {values.contactInfo && (
                  <div className="flex justify-between text-sm">
                    <span className="text-kc-muted">Contact Info</span>
                    <span className="font-medium text-kc-dark">{values.contactInfo}</span>
                  </div>
                )}
                {values.brandColors && (
                  <div className="flex justify-between text-sm">
                    <span className="text-kc-muted">Brand Colors</span>
                    <span className="font-medium text-kc-dark">{values.brandColors}</span>
                  </div>
                )}
                {values.notes && (
                  <div className="text-sm">
                    <span className="text-kc-muted">Notes</span>
                    <p className="mt-1 font-medium text-kc-dark">{values.notes}</p>
                  </div>
                )}
                <div className="border-t border-kc-border pt-3 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-kc-teal text-lg">{price ? formatDollars(price.total) : "--"}</span>
                </div>
              </CardContent>
            </Card>

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
              <div className="text-xl font-black text-kc-teal">{formatDollars(price.total)}</div>
            </div>
          )}

          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={goNext}
              className="bg-kc-teal hover:bg-kc-teal/90 text-white"
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : submitError?.startsWith("You'll need to sign in") ? (
            <Button asChild className="bg-kc-coral hover:bg-kc-coral/90 text-white">
              <a href={`/sign-in?redirect_url=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`}>
                Sign In to Continue <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          ) : (
            <Button
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
