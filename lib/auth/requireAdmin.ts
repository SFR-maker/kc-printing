import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
  }

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user: null };
  }

  return { error: null, user };
}

export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
  }

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    return { error: NextResponse.json({ error: "User not found" }, { status: 404 }), user: null };
  }

  return { error: null, user };
}
