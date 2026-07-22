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
    if (!isAccountRoute(request) && !isAdminRoute(request)) return;

    const { userId, sessionClaims } = await auth();

    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    if (isAdminRoute(request)) {
      const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
      if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/account", request.url));
      }
    }
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
