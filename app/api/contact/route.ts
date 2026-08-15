import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional(),
  service: z.string().min(1).max(80),
  message: z.string().min(10).max(5000),
  /**
   * Which language the sender wrote in. Optional, and defaulted rather than required, so an older
   * cached copy of the form still posts successfully.
   *
   * It exists to put a marker in the subject line. A Spanish enquiry answered in English is the
   * failure the Spanish page spent a paragraph apologising for before it had a form at all, and the
   * only thing standing between the two is whoever opens the email knowing which it is.
   */
  locale: z.enum(["en", "es"]).optional().default("en"),
});

/**
 * Best-effort in-process rate limit. Serverless means one bucket per warm instance rather than a
 * global one, so this is a speed bump for casual abuse, not a guarantee. It still matters: this is
 * an unauthenticated endpoint that sends an email on every accepted request, so without any limit
 * it is a free relay into the owner's inbox and burns the Resend quota. Move to Redis (Upstash) if
 * this ever gets targeted properly.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);

  // Bound the map so a spray of unique IPs can't grow it without limit.
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

/**
 * The submitted fields are interpolated into an HTML email that a human reads and trusts. Without
 * escaping, anyone can inject markup into it - working links to a phishing page, hidden text, a
 * spoofed "message from 611 Printing" block. Escape before it reaches the template.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/**
 * The two errors the sender actually reads, in the language they wrote in.
 *
 * The form renders whatever `error` comes back verbatim, so an English sentence here lands in the
 * middle of the Spanish contact page - on the one screen where something has already gone wrong and
 * the reader most needs to understand what to do next.
 */
const ERRORS = {
  en: {
    rateLimited: "Too many messages. Please try again shortly, or call (816) 521-0462.",
    sendFailed:
      "We could not send your message. Please email kansasdesigners@gmail.com or call (816) 521-0462.",
  },
  es: {
    rateLimited: "Demasiados mensajes. Inténtelo de nuevo en un momento o llame al (816) 521-0462.",
    sendFailed:
      "No pudimos enviar su mensaje. Escriba a kansasdesigners@gmail.com o llame al (816) 521-0462.",
  },
} as const;

export async function POST(req: Request) {
  // Parsed before the rate-limit check, purely so the limiter's own message can be returned in the
  // sender's language. What the limit protects is the email send below, which is still behind it.
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, email, phone, service, message, locale } = parsed.data;
  const isSpanish = locale === "es";
  const errors = ERRORS[locale];

  if (rateLimited(clientKey(req))) {
    return NextResponse.json({ error: errors.rateLimited }, { status: 429 });
  }

  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL ?? "hello@611printing.com",
          to: [process.env.ADMIN_EMAIL ?? "kansasdesigners@gmail.com"],
          reply_to: email,
          subject: `${isSpanish ? "[ES] " : ""}New Contact Form: ${service} from ${name}`,
          html: `
            ${isSpanish ? "<p><strong>Written in Spanish — reply in Spanish.</strong></p>" : ""}
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Phone:</strong> ${phone ? escapeHtml(phone) : "Not provided"}</p>
            <p><strong>Service:</strong> ${escapeHtml(service)}</p>
            <p><strong>Message:</strong></p>
            <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
          `,
        }),
      });

      // A 4xx from Resend (bad key, unverified sender, quota) used to be swallowed silently and the
      // sender still saw a success screen, so the enquiry vanished with nobody aware of it.
      if (!res.ok) {
        console.error("Resend rejected contact email:", res.status, await res.text().catch(() => ""));
        return NextResponse.json({ error: errors.sendFailed }, { status: 502 });
      }
    } catch (err) {
      console.error("Failed to send contact email:", err);
      return NextResponse.json({ error: errors.sendFailed }, { status: 502 });
    }
  }

  return NextResponse.json({ success: true });
}
