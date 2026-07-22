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
  "Other / Not Sure",
];

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setSubmitError(false);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Request failed");
      setSent(true);
    } catch {
      // Keep the entered data in place so the user doesn't have to retype it.
      setSubmitError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <section className="section-pad-tight bg-kc-bg">
        <div className="container-tight max-w-2xl">
          <h1 className="mb-4 text-4xl font-black tracking-tight text-kc-dark sm:text-5xl">Let&apos;s talk about your project</h1>
          <p className="text-lg leading-relaxed text-kc-muted">
            Call, text, or fill out the form below. We respond to all inquiries within a few hours during business days.
          </p>
        </div>
      </section>

      <section className="section-pad bg-kc-bg">
        <div className="container-tight grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="space-y-6">
            {[
              { icon: <Phone className="h-5 w-5 text-kc-coral" />, label: "Phone and Text", value: "(816) 521-0462", href: "tel:+18165210462" },
              { icon: <Mail className="h-5 w-5 text-kc-coral" />, label: "Email", value: "kansasdesigners@gmail.com", href: "mailto:kansasdesigners@gmail.com" },
              { icon: <MessageSquare className="h-5 w-5 text-kc-coral" />, label: "Response Time", value: "Within a few hours", href: null },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <div className="mt-0.5">{item.icon}</div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-kc-muted mb-0.5">{item.label}</div>
                  {item.href ? (
                    <a href={item.href} className="font-medium text-kc-dark hover:text-kc-teal transition-colors">
                      {item.value}
                    </a>
                  ) : (
                    <div className="font-medium text-kc-dark">{item.value}</div>
                  )}
                </div>
              </div>
            ))}

            <div className="pt-4 border-t border-kc-border">
              <div className="text-xs font-semibold uppercase tracking-wider text-kc-muted mb-3">Service Areas</div>
              <ul className="space-y-1 text-sm text-kc-muted">
                <li>Kansas City, MO</li>
                <li>Overland Park, KS</li>
                <li>Dallas, TX</li>
                <li>Plano, TX</li>
                <li>Addison, TX</li>
                <li>Nationwide Online</li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-2">
            {sent ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle2 className="h-12 w-12 text-kc-teal mb-4" />
                <h2 className="text-2xl font-bold text-kc-dark mb-2">Message Sent</h2>
                <p className="text-kc-muted max-w-sm">
                  We received your message and will get back to you within a few hours. You can also call or text us at (816) 521-0462.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-md border border-kc-border bg-white p-6 sm:p-8">
                {submitError && (
                  <div className="flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Something went wrong sending your message. Please try again, or reach us directly at (816) 521-0462.</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" placeholder="Your full name" {...register("name")} />
                    {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
                    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input id="phone" type="tel" placeholder="(816) 555-0000" {...register("phone")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Service Needed</Label>
                    <Select onValueChange={(v) => { if (v) setValue("service", v as string); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.service && <p className="text-xs text-red-500">{errors.service.message}</p>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us about your project, timeline, and any specific requirements..."
                    rows={5}
                    {...register("message")}
                  />
                  {errors.message && <p className="text-xs text-red-500">{errors.message.message}</p>}
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-kc-coral hover:bg-kc-coral/90 text-white">
                  {loading ? "Sending..." : "Send Message"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
