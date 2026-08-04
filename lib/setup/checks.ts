import { db } from "@/lib/prisma";
import { APP_URL } from "@/lib/app-url";
import { easypostConfigured, shipFromAddress } from "@/lib/shipping/easypost";

/**
 * Live readiness checks for the shop.
 *
 * A launch checklist in a document goes stale the moment something is configured. This reads the
 * actual environment and database on every load, so it can only ever say what is true right now.
 *
 * Values are never returned - only whether something is present and well-formed. A page that
 * printed a key so the owner could "check it" would be a page that leaks a key.
 */

export type CheckState = "ok" | "warn" | "blocked" | "off";

export interface Check {
  id: string;
  label: string;
  state: CheckState;
  detail: string;
  /** What the owner has to do, when there is something to do. */
  action?: string;
  /** Where to do it. */
  href?: string;
}

export interface CheckGroup {
  heading: string;
  checks: Check[];
}

function has(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

export async function runSetupChecks(): Promise<CheckGroup[]> {
  const [paidOrders, products, templates, admins] = await Promise.all([
    db.order.count({ where: { stripePaymentStatus: "paid" } }),
    db.product.count({ where: { active: true } }),
    db.cardTemplate.count({ where: { active: true } }),
    db.user.count({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } }),
  ]);

  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? "";
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const from = process.env.RESEND_FROM_EMAIL?.trim() ?? "";
  const appHost = (() => {
    try { return new URL(APP_URL).hostname; } catch { return ""; }
  })();

  return [
    {
      heading: "Taking money",
      checks: [
        {
          id: "stripe-key",
          label: "Stripe connected",
          ...(!stripeKey
            ? { state: "blocked" as const, detail: "No secret key. Checkout cannot open.", action: "Add STRIPE_SECRET_KEY in Vercel", href: "https://dashboard.stripe.com/apikeys" }
            : stripeKey.startsWith("sk_test")
              ? { state: "warn" as const, detail: "Test mode — real cards will be declined.", action: "Swap to the live key before launch", href: "https://dashboard.stripe.com/apikeys" }
              : { state: "ok" as const, detail: "Live key in place." }),
        },
        {
          id: "stripe-webhook",
          label: "Stripe webhook",
          ...(has("STRIPE_WEBHOOK_SECRET")
            ? { state: "ok" as const, detail: "Orders are marked paid automatically." }
            : { state: "blocked" as const, detail: "Without this an order is never marked paid, even after a successful charge.", action: "Add STRIPE_WEBHOOK_SECRET", href: "https://dashboard.stripe.com/webhooks" }),
        },
        {
          id: "stripe-tax",
          label: "Sales tax registration",
          state: "warn",
          detail: "Stripe Tax is enabled but computes $0 until you register a state. You operate from Kansas.",
          action: "Register Kansas in Stripe Tax",
          href: "https://dashboard.stripe.com/tax/registrations",
        },
        {
          id: "orders",
          label: "A real payment has completed",
          ...(paidOrders > 0
            ? { state: "ok" as const, detail: `${paidOrders} paid ${paidOrders === 1 ? "order" : "orders"} recorded.` }
            : { state: "warn" as const, detail: "No card payment has ever completed end to end.", action: "Place one real order before you advertise" }),
        },
      ],
    },
    {
      heading: "Accounts and access",
      checks: [
        {
          id: "clerk-mode",
          label: "Clerk instance",
          ...(clerkKey.startsWith("pk_live")
            ? { state: "ok" as const, detail: "Production instance." }
            : { state: "blocked" as const, detail: "Development keys. Capped at ~100 users, no production SLA, and every first visit pays a redirect through clerk.accounts.dev before the page loads.", action: "Create a production instance and swap both Clerk keys", href: "https://dashboard.clerk.com" }),
        },
        {
          id: "clerk-webhook",
          label: "Clerk webhook",
          ...(has("CLERK_WEBHOOK_SECRET")
            ? { state: "ok" as const, detail: "Name and email changes sync; deleted accounts are removed." }
            : { state: "warn" as const, detail: "Sign-in works without it, but profile edits in Clerk never reach the database and deleted accounts leave rows behind.", action: "Add the endpoint and CLERK_WEBHOOK_SECRET", href: "https://dashboard.clerk.com" }),
        },
        {
          id: "admins",
          label: "Admin account",
          ...(admins > 0
            ? { state: "ok" as const, detail: `${admins} admin ${admins === 1 ? "account" : "accounts"}.` }
            : { state: "blocked" as const, detail: "Nobody can reach this page.", action: "Sign up with an address in ADMIN_EMAIL" }),
        },
      ],
    },
    {
      heading: "Email",
      checks: [
        {
          id: "resend-key",
          label: "Resend connected",
          ...(has("RESEND_API_KEY")
            ? { state: "ok" as const, detail: "API key present." }
            : { state: "blocked" as const, detail: "No receipts, no shipping notices, no admin alerts.", action: "Add RESEND_API_KEY", href: "https://resend.com/api-keys" }),
        },
        {
          id: "resend-from",
          label: "Sender address",
          ...(!from
            ? { state: "blocked" as const, detail: "Falls back to a default that Resend will reject.", action: "Set RESEND_FROM_EMAIL" }
            : appHost && from.endsWith(`@${appHost}`)
              ? { state: "ok" as const, detail: `Sending as ${from}.` }
              : { state: "warn" as const, detail: `Sending as ${from}, which is not on ${appHost || "your domain"}. Mail from an unverified domain lands in spam.`, action: "Use an address on your verified domain" }),
        },
        {
          id: "resend-verify",
          label: "Test send",
          state: "off",
          detail: "Use the button below to prove a real email leaves the building and arrives.",
        },
      ],
    },
    {
      heading: "Shipping",
      checks: [
        {
          id: "easypost",
          label: "Live carrier rates",
          ...(easypostConfigured()
            ? { state: "ok" as const, detail: "Customers are quoted real carrier prices at checkout." }
            : has("EASYPOST_API_KEY")
              ? { state: "warn" as const, detail: "Key present but the despatch address is incomplete, so rates cannot be quoted.", action: "Set the SHIP_FROM_* variables" }
              : { state: "warn" as const, detail: "Flat-rate tiers are being charged instead of real carrier prices.", action: "Add EASYPOST_API_KEY", href: "https://app.easypost.com" }),
        },
        {
          id: "ship-from",
          label: "Despatch address",
          ...(shipFromAddress()
            ? { state: "ok" as const, detail: "Parcels are rated from your address." }
            : { state: "warn" as const, detail: "Not set.", action: "Set SHIP_FROM_STREET1, CITY, STATE and ZIP" }),
        },
        {
          id: "uploads",
          label: "Artwork uploads",
          ...(has("UPLOADTHING_TOKEN")
            ? { state: "ok" as const, detail: "Customers can upload print-ready files." }
            : { state: "blocked" as const, detail: "The upload path cannot work.", action: "Add UPLOADTHING_TOKEN" }),
        },
      ],
    },
    {
      heading: "The shop itself",
      checks: [
        {
          id: "domain",
          label: "Custom domain",
          ...(appHost && !appHost.endsWith("vercel.app")
            ? { state: "ok" as const, detail: `Serving ${appHost}.` }
            : { state: "warn" as const, detail: "Running on a vercel.app address, so every ranking signal accrues to a domain you do not own.", action: "Point your domain at the project" }),
        },
        {
          id: "catalogue",
          label: "Products on sale",
          ...(products >= 4
            ? { state: "ok" as const, detail: `${products} products live.` }
            : { state: "warn" as const, detail: `Only ${products} active.`, action: "Check /admin/products" , href: "/admin/products" }),
        },
        {
          id: "templates",
          label: "Design templates",
          ...(templates > 0
            ? { state: "ok" as const, detail: `${templates} templates available in the editor.` }
            : { state: "warn" as const, detail: "The design tool has nothing to offer." }),
        },
      ],
    },
  ];
}

/** Rolls the groups up into one headline number. */
export function summarise(groups: CheckGroup[]): { blocked: number; warn: number; ok: number } {
  const all = groups.flatMap((g) => g.checks);
  return {
    blocked: all.filter((c) => c.state === "blocked").length,
    warn: all.filter((c) => c.state === "warn").length,
    ok: all.filter((c) => c.state === "ok").length,
  };
}
