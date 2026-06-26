import { headers } from "next/headers";
import { Webhook } from "svix";
import { db } from "@/lib/prisma";

type ClerkUserEvent = {
  type: string;
  data: {
    id: string;
    email_addresses: { email_address: string }[];
    first_name?: string;
    last_name?: string;
  };
};

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) return new Response("Webhook secret not configured", { status: 500 });

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: ClerkUserEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as ClerkUserEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? "";

  if (evt.type === "user.created") {
    const email = evt.data.email_addresses[0]?.email_address ?? "";
    const name = [evt.data.first_name, evt.data.last_name].filter(Boolean).join(" ") || null;
    const role = email === adminEmail ? "SUPER_ADMIN" : "USER";

    await db.user.upsert({
      where: { clerkId: evt.data.id },
      update: { email, name, role: role as "USER" | "ADMIN" | "SUPER_ADMIN" },
      create: { clerkId: evt.data.id, email, name, role: role as "USER" | "ADMIN" | "SUPER_ADMIN" },
    });
  }

  if (evt.type === "user.updated") {
    const email = evt.data.email_addresses[0]?.email_address ?? "";
    const name = [evt.data.first_name, evt.data.last_name].filter(Boolean).join(" ") || null;

    await db.user.upsert({
      where: { clerkId: evt.data.id },
      update: { email, name },
      create: { clerkId: evt.data.id, email, name },
    });
  }

  if (evt.type === "user.deleted") {
    await db.user.deleteMany({ where: { clerkId: evt.data.id } });
  }

  return new Response("OK", { status: 200 });
}
