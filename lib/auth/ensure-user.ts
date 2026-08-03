import { currentUser } from "@clerk/nextjs/server";
import type { Role, User } from "@prisma/client";
import { db } from "@/lib/prisma";
import { safeClerkUserId } from "@/lib/safe-auth";

/**
 * Resolves the signed-in Clerk user to a row in our own `User` table, creating it if absent.
 *
 * The Clerk webhook at /api/webhooks/clerk was the only thing that ever created `User` rows, and it
 * returns 500 unless CLERK_WEBHOOK_SECRET is configured - which it was not, so the table sat empty
 * while people signed up perfectly happily. Nobody could reach /admin, and every order was recorded
 * as a guest order because there was no account to attach it to.
 *
 * Syncing lazily on read removes that dependency entirely: the row is created the first time a
 * signed-in user loads a page that needs one. The webhook remains useful for keeping names and
 * emails current and for handling deletions, but the site no longer breaks without it.
 */
export async function ensureUser(): Promise<User | null> {
  const clerkId = await safeClerkUserId();
  if (!clerkId) return null;

  const existing = await db.user.findUnique({ where: { clerkId } });
  if (existing) return existing;

  // Only reached once per account, so the extra call to Clerk costs nothing in steady state.
  const clerkUser = await currentUser().catch(() => null);
  if (!clerkUser) return null;

  const email = clerkUser.primaryEmailAddress?.emailAddress
    ?? clerkUser.emailAddresses[0]?.emailAddress
    ?? "";
  if (!email) return null;

  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
  const role: Role = isAdminEmail(email) ? "SUPER_ADMIN" : "USER";

  // An account may already exist under this email from a seed or an earlier Clerk instance. Email is
  // unique, so creating a second row would throw; re-point the existing one at the current Clerk id
  // instead. Clerk has verified the address, so matching on it is safe.
  const byEmail = await db.user.findUnique({ where: { email } });
  const user = byEmail
    ? await db.user.update({
        where: { id: byEmail.id },
        data: { clerkId, name: name ?? byEmail.name, role: byEmail.role === "USER" ? role : byEmail.role },
      })
    : await db.user.create({ data: { clerkId, email, name, role } });

  await claimGuestOrders(user.id, email);
  return user;
}

/**
 * Attaches past guest orders to a newly linked account.
 *
 * Someone who checked out without signing in and later creates an account with the same address
 * should find their history in /account/orders rather than an empty page. Clerk has verified the
 * address before we get here, so matching on it is not a way to claim someone else's orders.
 */
async function claimGuestOrders(userId: string, email: string): Promise<void> {
  await db.order.updateMany({
    where: { userId: null, guestEmail: { equals: email, mode: "insensitive" } },
    data: { userId },
  });
}

/**
 * Emails that are granted SUPER_ADMIN on first sign-in.
 *
 * Comma-separated so ownership does not depend on a single mailbox staying reachable. Compared
 * case-insensitively and trimmed, because ADMIN_EMAIL is typed by hand into a dashboard.
 */
function isAdminEmail(email: string): boolean {
  const configured = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return configured.includes(email.trim().toLowerCase());
}

/** True when the role may reach /admin. */
export function isAdminRole(role: Role | string | undefined | null): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
