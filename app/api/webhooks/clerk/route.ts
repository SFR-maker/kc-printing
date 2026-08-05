import { headers } from "next/headers";
import { isAdminEmail } from "@/lib/auth/ensure-user";
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

  if (evt.type === "user.created") {
    const email = evt.data.email_addresses[0]?.email_address ?? "";
    const name = [evt.data.first_name, evt.data.last_name].filter(Boolean).join(" ") || null;

    /**
     * Role is decided on create only, and never on update.
     *
     * This handler previously wrote `role` in the update branch too, so any user.created event for
     * an account that already existed - which is what a re-sign-in after the Clerk production
     * migration produces, once ensureUser has re-pointed the row at the new Clerk id - overwrote the
     * stored role. That silently demoted the shop owner from SUPER_ADMIN to USER and locked
     * everyone out of /admin.
     *
     * It also compared the address against ADMIN_EMAIL whole, while ADMIN_EMAIL is a comma-separated
     * list, so the admin branch could never be true in the first place. isAdminEmail handles the
     * list, trimming and case, and is the same check ensureUser uses - one source of truth rather
     * than two that disagree.
     */
    const role: "USER" | "SUPER_ADMIN" = isAdminEmail(email) ? "SUPER_ADMIN" : "USER";

    await db.user.upsert({
      where: { clerkId: evt.data.id },
      update: { email, name },
      create: { clerkId: evt.data.id, email, name, role },
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
