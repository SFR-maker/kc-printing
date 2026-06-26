"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CheckCircle2, Sparkles, Upload, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDollars } from "@/lib/utils";
import { calculatePrice } from "@/lib/pricing";
import type { ServiceDef } from "@/lib/service-data";

const schema = z.object({
  selectedOption: z.record(z.string(), z.string()).optional(),
  selectedPackage: z.string().min(1, "Please select a package"),
  selectedAddOns: z.array(z.string()).default([]),
  notes: z.string().optional(),
  businessName: z.string().min(1, "Business name is required"),
  contactInfo: z.string().optional(),
  brandColors: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
});

type FormValues = z.infer<typeof schema>;

interface ProductBuilderProps {
  service: ServiceDef;
  defaultPackage?: string;
}

const STEPS = ["Package", "Options", "Details", "Review"];

export function ProductBuilder({ service, defaultPackage }: ProductBuilderProps) {
  const [step, setStep] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<FormValues>({
    defaultValues: {
      selectedPackage: defaultPackage ?? "",
      selectedAddOns: [],
      quantity: 1,
    },
  });

  const { watch, setValue, register, handleSubmit, formState: { errors } } = form;
  const values = watch();

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
          type: service.slug === "logo-design" ? "logo_concepts" :
                service.slug === "business-cards" ? "card_copy" :
                service.slug === "postcards" ? "postcard_copy" :
                service.slug.includes("banner") ? "banner_headline" :
                service.slug === "web-design" ? "website_copy" : "brief_summary",
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
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: service.slug, ...typed }),
      });
      const result = await res.json() as { orderId?: string; error?: string };
      if (result.orderId) {
        const checkoutRes = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: result.orderId }),
        });
        const checkout = await checkoutRes.json() as { url?: string };
        if (checkout.url) window.location.href = checkout.url;
      }
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="section-pad container-tight max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-kc-dark mb-2">Order {service.name}</h1>
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
              <span className={cn("text-sm hidden sm:block", i === step ? "font-semibold text-kc-dark" : "text-kc-muted")}>{s}</span>
              {i < STEPS.length - 1 && <div className="h-px w-6 bg-kc-border" />}
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
              .filter((s) => ["SIZE", "PAPER", "ORIENTATION"].some((t) => s.label.toUpperCase().includes(t)))
              .map((spec) => (
                <div key={spec.label} className="space-y-2">
                  <Label>{spec.label}</Label>
                  <p className="text-sm text-kc-muted">{spec.value}</p>
                </div>
              ))}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity / Scope</Label>
              <Input id="quantity" type="number" min="1" {...register("quantity")} className="max-w-xs" />
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
                {values.businessName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-kc-muted">Business Name</span>
                    <span className="font-medium text-kc-dark">{values.businessName}</span>
                  </div>
                )}
                <div className="border-t border-kc-border pt-3 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-kc-teal text-lg">{price ? formatDollars(price.total) : "--"}</span>
                </div>
              </CardContent>
            </Card>
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
              onClick={() => setStep((s) => s + 1)}
              className="bg-kc-teal hover:bg-kc-teal/90 text-white"
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
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
