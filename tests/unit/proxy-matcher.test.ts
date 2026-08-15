import { describe, it, expect } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config } from "@/proxy";

/**
 * Which paths the proxy runs on.
 *
 * The matcher used to be the Next default-broad pattern, so this question had a boring answer:
 * everything. Narrowing it to the paths that actually need Clerk auth context is what stops a
 * prerendered page or a CDN-cached API response from costing a function invocation - but it turns
 * the matcher into a correctness surface. A route that needs auth and is not listed does not throw
 * at build time and does not 500 at runtime; it silently sees every visitor as signed out.
 *
 * That is the failure this file exists to catch. The MATCHED list below is derived from the call
 * sites - every module under app/ and lib/ calling auth(), requireAuth(), requireAdmin(),
 * ensureUser() or currentUser() - so adding a route that needs auth without adding it to the
 * matcher fails here.
 *
 * Note the import: the Next docs name this `unstable_doesProxyMatch`, but the function actually
 * exported by next@16 is `unstable_doesMiddlewareMatch`.
 */

const url = (path: string) => `https://611printing.com${path}`;
const matches = (path: string) => unstable_doesMiddlewareMatch({ config, url: url(path) });

/** Paths that MUST run the proxy, each with the call site that requires it. */
const MATCHED: [string, string][] = [
  ["/account", "app/account/layout.tsx - safeClerkUserId"],
  ["/account/orders", "app/account/orders/page.tsx - ensureUser"],
  ["/account/settings", "app/account/settings/page.tsx"],
  ["/admin", "app/admin/layout.tsx - ensureUser"],
  ["/admin/orders/abc123", "admin subtree"],
  ["/api/admin/specials", "requireAdmin"],
  ["/api/admin/orders/abc/print-file", "requireAdmin"],
  ["/api/ai-design", "app/api/ai-design/route.ts"],
  ["/api/ai/generate", "app/api/ai/generate/route.ts - requireAuth"],
  ["/api/card-designs", "app/api/card-designs/route.ts"],
  ["/api/card-designs/abc123", "app/api/card-designs/[id]/route.ts"],
  ["/api/coupons/validate", "requireAuth"],
  ["/api/orders", "app/api/orders/route.ts - requireAuth"],
  ["/api/stripe/checkout", "app/api/stripe/checkout/route.ts"],
  // lib/uploadthing.ts calls a bare auth() and throws - missing this breaks all uploads.
  ["/api/uploadthing", "lib/uploadthing.ts - bare auth()"],
  // lib/business-card/load-editor-design.ts calls a bare auth(), try/caught - fails silently.
  ["/services/business-cards/design/t-solar-01", "load-editor-design"],
  ["/services/banners/design/abc123", "load-editor-design"],
];

/** Paths that MUST NOT run the proxy. Every one of these is an invocation saved per request. */
const UNMATCHED: [string, string][] = [
  ["/", "prerendered homepage"],
  ["/about", "static"],
  ["/faq", "static"],
  ["/pricing", "static"],
  ["/services", "static"],
  ["/services/business-cards", "storefront product page"],
  ["/es", "Spanish homepage, ISR"],
  ["/es/servicios/lonas-publicitarias", "Spanish product page"],
  ["/specials", "ISR"],
  ["/portfolio", "ISR"],
  ["/api/card-templates", "anonymous gallery data"],
  ["/api/price/rigid-signs", "pure pricing lookup, no auth"],
  ["/api/price/banners", "pure pricing lookup, no auth"],
  ["/api/contact", "anonymous contact form"],
  // Unauthenticated by design - carved out of the /api/card-designs prefix.
  ["/api/card-designs/export", "unauthenticated export"],
  // Both verify their own signatures and never call auth().
  ["/api/stripe/webhook", "stripe signature-verified"],
  ["/api/webhooks/clerk", "svix signature-verified"],
  // The gallery landing, as opposed to /design/<designId> which loads a saved design.
  ["/services/business-cards/design", "template gallery, no auth"],
];

describe("proxy matcher", () => {
  it.each(MATCHED)("runs on %s (%s)", (path) => {
    expect(matches(path), `${path} needs auth context but the proxy does not run on it`).toBe(true);
  });

  it.each(UNMATCHED)("does not run on %s (%s)", (path) => {
    expect(matches(path), `${path} pays a proxy invocation it does not need`).toBe(false);
  });

  it("carves export out of the card-designs prefix without dropping the id route", () => {
    // The one pattern here with real subtlety, asserted as a pair so neither half can rot alone.
    expect(matches("/api/card-designs/export")).toBe(false);
    expect(matches("/api/card-designs/some-design-id")).toBe(true);
  });

  it("leaves the storefront entirely alone", () => {
    // The commercial path is the highest-traffic part of the site and needs no auth context.
    for (const product of ["business-cards", "postcards", "banners", "rigid-signs", "window-decals"]) {
      expect(matches(`/services/${product}`), product).toBe(false);
    }
  });
});
