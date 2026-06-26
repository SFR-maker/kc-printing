import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/services(.*)",
  "/pricing(.*)",
  "/portfolio(.*)",
  "/about(.*)",
  "/contact(.*)",
  "/faq(.*)",
  "/terms(.*)",
  "/privacy(.*)",
  "/refund-policy(.*)",
  "/success(.*)",
  "/cancel(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/contact(.*)",
  "/api/stripe/webhook(.*)",
  "/api/uploadthing(.*)",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);
const isAccountRoute = createRouteMatcher(["/account(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (isAdminRoute(req)) {
    const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/account", req.url));
    }
  }

  if (isAccountRoute(req) && !userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)","/(api|trpc)(.*)"],
};
