import { NextResponse } from "next/server";
import { ensureUser, isAdminRole } from "@/lib/auth/ensure-user";

export async function requireAdmin() {
  // Same lazy sync as the admin layout, so an API route never disagrees with the page that called
  // it about whether the caller exists.
  const user = await ensureUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
  }
  if (!isAdminRole(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user: null };
  }
  return { error: null, user };
}

export async function requireAuth() {
  const user = await ensureUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
  }
  return { error: null, user };
}
