import { auth } from "@clerk/nextjs/server";

/**
 * Clerk's auth() throws if it can't find the auth-context headers its own middleware is supposed
 * to attach to the request — which, on this Next.js 16 build, only happens on requests clerkMiddleware
 * actually rewrites (not the common pass-through case), so it currently throws on every API route
 * call regardless of sign-in state. Treating that as "not signed in" keeps the anonymous-user path
 * (the common case for guest checkout / anonymous designs) working; signed-in association is best-effort
 * until the underlying Clerk/Next.js proxy incompatibility is resolved.
 */
export async function safeClerkUserId(): Promise<string | null> {
  try {
    const { userId } = await auth();
    return userId ?? null;
  } catch {
    return null;
  }
}

/** Same as safeClerkUserId, but for call sites (e.g. admin role checks) that also need sessionClaims. */
export async function safeClerkAuth(): Promise<{ userId: string | null; sessionClaims: unknown }> {
  try {
    const { userId, sessionClaims } = await auth();
    return { userId: userId ?? null, sessionClaims };
  } catch {
    return { userId: null, sessionClaims: null };
  }
}
