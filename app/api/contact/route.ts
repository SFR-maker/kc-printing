import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  service: z.string().min(1),
  message: z.string().min(10),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (process.env.RESEND_API_KEY) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL ?? "hello@kcprinting.com",
          to: [process.env.ADMIN_EMAIL ?? "kansasdesigners@gmail.com"],
          subject: `New Contact Form: ${parsed.data.service} from ${parsed.data.name}`,
          html: `
            <p><strong>Name:</strong> ${parsed.data.name}</p>
            <p><strong>Email:</strong> ${parsed.data.email}</p>
            <p><strong>Phone:</strong> ${parsed.data.phone ?? "Not provided"}</p>
            <p><strong>Service:</strong> ${parsed.data.service}</p>
            <p><strong>Message:</strong></p>
            <p>${parsed.data.message.replace(/\n/g, "<br>")}</p>
          `,
        }),
      });
    } catch (err) {
      console.error("Failed to send contact email:", err);
    }
  }

  return NextResponse.json({ success: true });
}
