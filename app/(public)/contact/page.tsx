"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone, Mail, MessageSquare, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  service: z.string().min(1, "Please select a service"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type FormValues = z.infer<typeof schema>;

const SERVICES = [
  "Business Cards",
  "Postcards",
  "Banners",
  "Rigid Signs",
  "Other / Not Sure",
];

const FIELD =
  "edge h-11 border-kc-dark/20 text-[16.05px] text-kc-dark placeholder:text-kc-dark/70 focus-visible:border-kc-dark/40";

export default function ContactPage() {
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
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        // The route now returns a specific message for rate limiting (429) and mail-provider
        // failures (502); surface it instead of a generic "something went wrong".
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? "Request failed");
      }
      setSent(true);
    } catch (err) {
      // Keep the entered data in place so the user doesn't have to retype it.
      setSubmitError(
        err instanceof Error && err.message !== "Request failed"
          ? err.message
          : "Something went wrong sending your message. Please try again, or reach us directly at (816) 521-0462."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="bg-kc-bg">
        <div className="reg-bar" />
        <div className="container-tight px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pb-12 lg:pt-24">
          <div className="max-w-2xl">
            <h1 className="display-tight text-[2.94rem] text-kc-dark sm:text-6xl">
              Let&apos;s talk about your project
            </h1>
            <p className="mt-5 text-[18.19px] leading-relaxed text-kc-dark/75">
              Call, text, or fill out the form. We respond to all enquiries within a few hours
              during business days.
            </p>
          </div>
        </div>
      </section>

      <section className="band-tight bg-kc-paper">
        <div className="container-tight grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <dl className="divide-y divide-kc-dark/12 border-t border-kc-dark/12">
              {[
                {
                  icon: <Phone className="h-4 w-4 text-kc-coral" strokeWidth={1.75} />,
                  label: "Phone and text",
                  value: "(816) 521-0462",
                  href: "tel:+18165210462",
                },
                {
                  icon: <Mail className="h-4 w-4 text-kc-coral" strokeWidth={1.75} />,
                  label: "Email",
                  value: "kansasdesigners@gmail.com",
                  href: "mailto:kansasdesigners@gmail.com",
                },
                {
                  icon: <MessageSquare className="h-4 w-4 text-kc-coral" strokeWidth={1.75} />,
                  label: "Response time",
                  value: "Within a few hours",
                  href: null,
                },
              ].map((item) => (
                // dt and dd must be the only children of a dl group. The icon sat alongside an
                // inner div holding them, which put the term and its value outside the list as far
                // as assistive tech was concerned; moving the icon into the dt fixes the structure
                // and reads better too, since it labels the term rather than floating beside it.
                <div key={item.label} className="py-4">
                  <dt className="flex items-center gap-2 text-[13.91px] text-kc-dark/70">
                    <span className="shrink-0">{item.icon}</span>
                    {item.label}
                  </dt>
                  <dd className="mt-0.5 pl-6">
                      {item.href ? (
                        <a
                          href={item.href}
                          className="text-[16.05px] font-medium text-kc-dark transition-colors hover:text-kc-magenta-deep"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <span className="text-[16.05px] font-medium text-kc-dark">{item.value}</span>
                      )}
                    </dd>
                </div>
              ))}
            </dl>

            <div className="mt-10">
              <h2 className="text-[13.91px] font-semibold text-kc-dark">Service areas</h2>
              <ul className="mt-3 space-y-1.5 text-[14.98px] text-kc-dark/70">
                {["Kansas City, MO", "Johnson County, KS", "Dallas-Fort Worth, TX", "Nationwide Online"].map((city) => (
                  <li key={city}>{city}</li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            {sent ? (
              <div className="edge border border-kc-dark/12 bg-white p-8 sm:p-12">
                <CheckCircle2 className="h-9 w-9 text-kc-coral" strokeWidth={1.5} />
                <h2 className="display-tight mt-5 text-2xl text-kc-dark sm:text-[2.03rem]">
                  Message sent
                </h2>
                <p className="mt-3 max-w-sm text-[16.59px] leading-relaxed text-kc-dark/75">
                  We received your message and will get back to you within a few hours. You can also
                  call or text us at (816) 521-0462.
                </p>
              </div>
            ) : (
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
                      Name
                    </Label>
                    <Input id="name" placeholder="Your full name" className={FIELD} {...register("name")} />
                    {errors.name && <p className="text-[13.38px] text-red-700">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[14.45px] font-medium text-kc-dark">
                      Email
                    </Label>
                    <Input id="email" type="email" placeholder="you@example.com" className={FIELD} {...register("email")} />
                    {errors.email && <p className="text-[13.38px] text-red-700">{errors.email.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[14.45px] font-medium text-kc-dark">
                      Phone (optional)
                    </Label>
                    <Input id="phone" type="tel" placeholder="(816) 555-0000" className={FIELD} {...register("phone")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[14.45px] font-medium text-kc-dark">Service needed</Label>
                    <Select onValueChange={(v) => { if (v) setValue("service", v as string); }}>
                      <SelectTrigger aria-label="Service needed" className={FIELD}>
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.service && <p className="text-[13.38px] text-red-700">{errors.service.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-[14.45px] font-medium text-kc-dark">
                    Message
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us about your project, timeline, and any specific requirements"
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
                  {loading ? "Sending..." : "Send message"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
