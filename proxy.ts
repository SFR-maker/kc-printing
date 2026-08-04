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

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)","/(api|trpc)(.*)"],
};
