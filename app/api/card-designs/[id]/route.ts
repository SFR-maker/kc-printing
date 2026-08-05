import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { CardSideSchema } from "@/lib/business-card/schema";
import { safeClerkUserId } from "@/lib/safe-auth";

const updateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  front: CardSideSchema.optional(),
  back: CardSideSchema.optional(),
  thumbnailFront: z.string().nullable().optional(),
  thumbnailBack: z.string().nullable().optional(),
});

/**
 * Resolves a design the caller is entitled to read and write.
 *
 * Two identities can own a design and both have to work on every verb, which is what was wrong
 * before:
 *
 *   - PATCH accepted only a signed-in owner, so an anonymous customer's autosave answered 401 on
 *     every keystroke after the first save. The editor treats autosave failures as non-fatal, so the
 *     work simply never left the browser.
 *   - GET fell back to the browser token only when nobody was signed in. Signing in therefore made
 *     your own anonymous designs unreachable - 404 on a design you had just drawn - because
 *     `design.userId !== user.id` is true when userId is null.
 *
 * Signing in also claims the design: an account is the durable home for it, a localStorage token is
 * not, and 31 of the 32 designs on file were reachable only by browser token. Claiming is what makes
 * them appear in the account's own list.
 */
async function resolveDesign(req: Request, id: string) {
  const token = new URL(req.url).searchParams.get("anonymousToken");
  const design = await db.cardDesign.findUnique({ where: { id } });
  if (!design) return { error: NextResponse.json({ error: "Design not found" }, { status: 404 }), design: null };

  const tokenMatches = Boolean(token && design.anonymousToken && design.anonymousToken === token);
  const clerkId = await safeClerkUserId();

  if (clerkId) {
    const user = await db.user.findUnique({ where: { clerkId } });
    if (!user) return { error: NextResponse.json({ error: "User not found" }, { status: 404 }), design: null };

    if (design.userId === user.id) return { error: null, design };

    // Made in this browser before signing in: hand it to the account and drop the token, so it is
    // no longer tied to storage that a browser can clear.
    if (design.userId === null && tokenMatches) {
      const claimed = await db.cardDesign.update({
        where: { id },
        data: { userId: user.id, anonymousToken: null },
      });
      return { error: null, design: claimed };
    }

    return { error: NextResponse.json({ error: "Design not found" }, { status: 404 }), design: null };
  }

  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), design: null };
  if (!tokenMatches) return { error: NextResponse.json({ error: "Design not found" }, { status: 404 }), design: null };
  return { error: null, design };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, design } = await resolveDesign(req, id);
  if (error) return error;
  return NextResponse.json({ design });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await resolveDesign(req, id);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid update", details: parsed.error.flatten() }, { status: 400 });

  const updated = await db.cardDesign.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ id: updated.id, updatedAt: updated.updatedAt });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await resolveDesign(req, id);
  if (error) return error;

  await db.cardDesign.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
