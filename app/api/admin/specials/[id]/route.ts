import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/prisma";
import { SPECIALS_TAG } from "@/lib/cache-tags";
import { blankToNull, specialFields } from "../route";

/**
 * Edits or removes a promotion.
 *
 * The input schema is shared with the create route, so a field that is validated on the way in
 * cannot be smuggled past on the way through an edit - which is the usual way a URL restriction
 * like ctaHref's ends up applying to new records only.
 *
 * The slug is deliberately immutable. It is the anchor /specials links to and the key the promo bar
 * remembers a dismissal against; renaming it silently breaks a link someone has shared and
 * un-dismisses the bar for every visitor who already closed it.
 */

// The un-refined base, since Zod cannot make a refined schema partial - and the date window is
// re-checked below against the stored record, which is stricter than the create-time refinement.
const partial = specialFields.partial();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, user: admin } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = partial.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const v = parsed.data;

  const before = await db.special.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Special not found" }, { status: 404 });

  /**
   * The date window has to be checked against the record as it will be, not against the patch.
   *
   * A partial edit that moves only the start date past the stored end date passes the create
   * schema's cross-field check trivially, because the patch contains one date and the refinement
   * needs two.
   */
  const startsAt = v.startsAt !== undefined ? (v.startsAt ? new Date(v.startsAt) : null) : before.startsAt;
  const endsAt = v.endsAt !== undefined ? (v.endsAt ? new Date(v.endsAt) : null) : before.endsAt;
  if (startsAt && endsAt && startsAt >= endsAt) {
    return NextResponse.json({ error: "The end date must be after the start date" }, { status: 400 });
  }

  // Built key by key rather than spread, so a field the form did not send keeps its stored value
  // instead of being overwritten with undefined.
  const special = await db.special.update({
    where: { id },
    data: {
      ...(v.title !== undefined && { title: v.title }),
      ...(v.blurb !== undefined && { blurb: v.blurb }),
      ...(v.body !== undefined && { body: blankToNull(v.body) }),
      ...(v.imageUrl !== undefined && { imageUrl: blankToNull(v.imageUrl) }),
      ...(v.ctaLabel !== undefined && { ctaLabel: blankToNull(v.ctaLabel) }),
      ...(v.ctaHref !== undefined && { ctaHref: blankToNull(v.ctaHref) }),
      ...(v.couponCode !== undefined && { couponCode: blankToNull(v.couponCode)?.toUpperCase() ?? null }),
      ...(v.titleEs !== undefined && { titleEs: blankToNull(v.titleEs) }),
      ...(v.blurbEs !== undefined && { blurbEs: blankToNull(v.blurbEs) }),
      ...(v.bodyEs !== undefined && { bodyEs: blankToNull(v.bodyEs) }),
      ...(v.ctaLabelEs !== undefined && { ctaLabelEs: blankToNull(v.ctaLabelEs) }),
      ...(v.active !== undefined && { active: v.active }),
      ...(v.showInBar !== undefined && { showInBar: v.showInBar }),
      ...(v.sortOrder !== undefined && { sortOrder: v.sortOrder }),
      ...(v.startsAt !== undefined && { startsAt }),
      ...(v.endsAt !== undefined && { endsAt }),
    },
  });

  await logAudit({
    userId: admin!.id, action: "special.update", entity: "Special", entityId: id,
    before: { title: before.title, active: before.active, showInBar: before.showInBar },
    after: v, ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  revalidateTag(SPECIALS_TAG, "max");

  return NextResponse.json(special);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, user: admin } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const before = await db.special.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Special not found" }, { status: 404 });
  await db.special.delete({ where: { id } });

  await logAudit({
    userId: admin!.id, action: "special.delete", entity: "Special", entityId: id,
    before: { slug: before.slug, title: before.title },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  revalidateTag(SPECIALS_TAG, "max");

  return NextResponse.json({ success: true });
}
