import { NextRequest, NextResponse } from "next/server";

// When Clerk keys are not set, all routes pass through (auth enforced at page level)
const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const CLERK_SECRET = process.env.CLERK_SECRET_KEY;

let _handler: ((req: NextRequest, evt: unknown) => Response | Promise<Response>) | null = null;

async function getClerkHandler() {
  if (_handler) return _handler;
  const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");

  // Only /account and /admin actually require a signed-in user (both also check auth() again at
  // the page level as a second layer). Everything else — including any route not listed here —
  // falls through to normal Next.js routing, so a genuine 404 renders instead of every unmatched
  // URL bouncing to /sign-in.
  const isAccountRoute = createRouteMatcher(["/account(.*)"]);
  const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

  _handler = clerkMiddleware(async (auth, request) => {
    // Call auth() unconditionally (not just for /account and /admin) — on this Next.js build,
    // clerkMiddleware only attaches the auth-context headers that downstream route handlers'
    // auth()/safeClerkUserId() calls depend on when this callback actually invokes auth() for
    // the request. Skipping it on the pass-through path (the previous behavior) meant every other
    // route — including every /api/* handler — never got that context, so requireAuth() treated
    // every request as signed-out regardless of actual session state. See lib/safe-auth.ts.
    const { userId } = await auth();

    if (!isAccountRoute(request) && !isAdminRoute(request)) return;

    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    // Deliberately no role check here.
    //
    // Roles live in our own database, and middleware runs on the edge with no database access, so
    // the only thing available at this layer is `sessionClaims.metadata.role` - a Clerk session
    // claim that is empty unless someone has both set publicMetadata on the user AND customised
    // the session token template. Neither was ever done, so this branch bounced every single
    // request to /admin back to /account, including the shop owner's, before the page that grants
    // the role could run.
    //
    // Authentication is what middleware can answer cheaply and correctly; authorisation is not.
    // The admin layout and requireAdmin() both resolve the real role against the database, so
    // letting a signed-in non-admin reach them costs one redirect and denies nothing.
  }) as (req: NextRequest, evt: unknown) => Response | Promise<Response>;

  return _handler;
}

export default async function middleware(req: NextRequest, evt: unknown) {
  if (!CLERK_KEY || !CLERK_SECRET) {
    return NextResponse.next();
  }
  try {
    const handler = await getClerkHandler();
    return await handler(req, evt);
  } catch {
    return NextResponse.next();
  }
}

/**
 * Exactly the paths that need Clerk auth context, and nothing else.
 *
 * This was the Next default-broad matcher, which meant this function ran on every request the site
 * serves: every prerendered page, every ISR hit that the CDN could otherwise have answered alone,
 * every static asset request that slipped the extension list, and every /api/* route including both
 * webhooks. On Vercel the proxy runs *before* the CDN cache is consulted, so a cache hit still cost
 * an invocation - it set a floor on billing that no amount of caching downstream could lower.
 *
 * The list below is derived from the call sites, not guessed: every file under app/ and lib/ that
 * calls auth(), requireAuth(), requireAdmin(), ensureUser() or currentUser(). Two of them are easy
 * to miss and expensive to get wrong:
 *
 *   - /api/uploadthing. lib/uploadthing.ts calls a bare auth() and throws "Unauthorized" with no
 *     safeClerkUserId wrapper, so dropping it here breaks every customer file upload outright.
 *   - /services/<product>/design/<designId>. lib/business-card/load-editor-design.ts calls a bare
 *     auth(). It is try/caught, so this fails quietly rather than loudly: a signed-in customer
 *     would simply find their saved designs missing.
 *
 * And two deliberate exclusions:
 *
 *   - /api/card-designs/export is unauthenticated by design (see the route), so it is carved out of
 *     the /api/card-designs prefix rather than swept in with it.
 *   - Both webhooks verify their own signatures (svix for Clerk, the Stripe SDK for Stripe) and
 *     never call auth(). They are not listed.
 *
 * tests/unit/proxy-matcher.test.ts asserts every entry here, so a future route that needs auth and
 * does not get it fails a test rather than failing a customer.
 */
export const config = {
  matcher: [
    "/account/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/ai-design",
    "/api/ai/generate",
    "/api/card-designs",
    // Matches /api/card-designs/<id> but not /api/card-designs/export.
    "/api/card-designs/((?!export).*)",
    "/api/coupons/validate",
    "/api/orders",
    "/api/stripe/checkout",
    "/api/uploadthing/:path*",
    "/services/:product/design/:designId",
  ],
};
