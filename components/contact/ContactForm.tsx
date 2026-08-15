"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SERVICES } from "@/lib/service-data";
import { SERVICES_ES } from "@/lib/service-data-es";
import type { Locale } from "@/lib/i18n/config";

/**
 * The enquiry form, in either language.
 *
 * One component rather than a Spanish copy of the English one. The Spanish site had no written
 * intake at all - phone and email only - so anyone who preferred to type had to leave, and every
 * validation rule and error path that already existed here would have had to be written a second
 * time to fix it. Sharing the component means the two forms cannot drift on what they require, and
 * the service list is read from the product data rather than typed out, which is what stops it going
 * stale: the English page listed four products and quietly omitted window decals for months.
 */

const COPY = {
  en: {
    nameLabel: "Name",
    namePlaceholder: "Your full name",
    nameRequired: "Name is required",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    emailInvalid: "Valid email required",
    phoneLabel: "Phone (optional)",
    phonePlaceholder: "(816) 555-0000",
    serviceLabel: "Service needed",
    servicePlaceholder: "Select a service",
    serviceRequired: "Please select a service",
    serviceOther: "Other / Not sure",
    messageLabel: "Message",
    messagePlaceholder: "Tell us about your project, timeline, and any specific requirements",
    messageShort: "Message must be at least 10 characters",
    submit: "Send message",
    submitting: "Sending...",
    sentTitle: "Message sent",
    sentBody:
      "We received your message and will get back to you within a few hours. You can also call or text us at (816) 521-0462.",
    genericError:
      "Something went wrong sending your message. Please try again, or reach us directly at (816) 521-0462.",
  },
  es: {
    nameLabel: "Nombre",
    namePlaceholder: "Su nombre completo",
    nameRequired: "El nombre es obligatorio",
    emailLabel: "Correo electrónico",
    emailPlaceholder: "usted@ejemplo.com",
    emailInvalid: "Se requiere un correo válido",
    phoneLabel: "Teléfono (opcional)",
    phonePlaceholder: "(816) 555-0000",
    serviceLabel: "Producto que necesita",
    servicePlaceholder: "Elija un producto",
    serviceRequired: "Elija un producto",
    serviceOther: "Otro / No estoy seguro",
    messageLabel: "Mensaje",
    messagePlaceholder: "Cuéntenos sobre su proyecto, para cuándo lo necesita y cualquier requisito especial",
    messageShort: "El mensaje debe tener al menos 10 caracteres",
    submit: "Enviar mensaje",
    submitting: "Enviando...",
    sentTitle: "Mensaje enviado",
    sentBody:
      "Recibimos su mensaje y le respondemos en unas horas, en español. También puede llamarnos o enviarnos un mensaje de texto al (816) 521-0462.",
    genericError:
      "No pudimos enviar su mensaje. Inténtelo de nuevo o llámenos directamente al (816) 521-0462.",
  },
} as const;

const FIELD =
  "edge h-11 border-kc-dark/20 text-[16.05px] text-kc-dark placeholder:text-kc-dark/70 focus-visible:border-kc-dark/40";

const SERVICE_SLUGS = ["business-cards", "postcards", "banners", "rigid-signs", "window-decals"];

export function ContactForm({ locale = "en" }: { locale?: Locale }) {
  const c = COPY[locale] ?? COPY.en;

  const schema = z.object({
    name: z.string().min(2, c.nameRequired),
    email: z.string().email(c.emailInvalid),
    phone: z.string().optional(),
    service: z.string().min(1, c.serviceRequired),
    message: z.string().min(10, c.messageShort),
  });
  type FormValues = z.infer<typeof schema>;

  const products = locale === "es" ? SERVICES_ES : SERVICES;
  const serviceOptions = [...SERVICE_SLUGS.map((slug) => products[slug].name), c.serviceOther];

  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    // The service Select isn't a native input react-hook-form can auto-register, so without an
    // explicit default it starts as `undefined` — which fails Zod's string type check with a raw
    // "expected string, received undefined" message instead of the friendly one on .min(1, ...).
    defaultValues: { service: "" },
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The locale rides along so the notification email can be tagged: a message written in
        // Spanish that comes back in English is the same failure as having had no form at all.
        body: JSON.stringify({ ...data, locale }),
      });
      if (!res.ok) {
        // The route returns a specific message for rate limiting (429) and mail-provider
        // failures (502); surface it instead of a generic "something went wrong".
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? "Request failed");
      }
      setSent(true);
    } catch (err) {
      // Keep the entered data in place so the user doesn't have to retype it.
      setSubmitError(
        err instanceof Error && err.message !== "Request failed" ? err.message : c.genericError
      );
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="edge border border-kc-dark/12 bg-white p-8 sm:p-12">
        <CheckCircle2 className="h-9 w-9 text-kc-coral" strokeWidth={1.5} />
        <h2 className="display-tight mt-5 text-2xl text-kc-dark sm:text-[2.03rem]">{c.sentTitle}</h2>
        <p className="mt-3 max-w-sm text-[16.59px] leading-relaxed text-kc-dark/75">{c.sentBody}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="edge space-y-5 border border-kc-dark/12 bg-white p-6 sm:p-8"
    >
      {submitError && (
        <div
          role="alert"
          className="edge flex items-start gap-2.5 border border-red-300 bg-red-50 p-3.5 text-[14.98px] leading-snug text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>{submitError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-[14.45px] font-medium text-kc-dark">
            {c.nameLabel}
          </Label>
          <Input id="name" placeholder={c.namePlaceholder} className={FIELD} {...register("name")} />
          {errors.name && <p className="text-[13.38px] text-red-700">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[14.45px] font-medium text-kc-dark">
            {c.emailLabel}
          </Label>
          <Input id="email" type="email" placeholder={c.emailPlaceholder} className={FIELD} {...register("email")} />
          {errors.email && <p className="text-[13.38px] text-red-700">{errors.email.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-[14.45px] font-medium text-kc-dark">
            {c.phoneLabel}
          </Label>
          <Input id="phone" type="tel" placeholder={c.phonePlaceholder} className={FIELD} {...register("phone")} />
        </div>
        <div className="space-y-2">
          <Label className="text-[14.45px] font-medium text-kc-dark">{c.serviceLabel}</Label>
          <Select onValueChange={(v) => { if (v) setValue("service", v as string); }}>
            <SelectTrigger aria-label={c.serviceLabel} className={FIELD}>
              <SelectValue placeholder={c.servicePlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {serviceOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.service && <p className="text-[13.38px] text-red-700">{errors.service.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message" className="text-[14.45px] font-medium text-kc-dark">
          {c.messageLabel}
        </Label>
        <Textarea
          id="message"
          placeholder={c.messagePlaceholder}
          rows={6}
          className="edge border-kc-dark/20 text-[16.05px] text-kc-dark placeholder:text-kc-dark/70 focus-visible:border-kc-dark/40"
          {...register("message")}
        />
        {errors.message && <p className="text-[13.38px] text-red-700">{errors.message.message}</p>}
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="edge h-12 w-full bg-kc-coral text-[16.05px] font-semibold text-white transition-colors hover:bg-kc-magenta-deep disabled:opacity-60"
      >
        {loading ? c.submitting : c.submit}
      </Button>
    </form>
  );
}
