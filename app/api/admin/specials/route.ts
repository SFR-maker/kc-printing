import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/prisma";
import { slugifySpecial } from "@/lib/specials-shared";

/**
 * Creates a promotion.
 *
 * Editing and deletion live at /api/admin/specials/[id]; this route only makes new ones, which is
 * why the slug is generated here and never accepted from the client - a slug is an identity, and
 * letting the form supply one invites two specials that differ only by a trailing hyphen.
 */

/**
 * The fields, without the cross-field date check.
 *
 * Exported separately because Zod refuses `.partial()` on a schema carrying a `.refine()`, and the
 * PATCH route needs a partial version. It does its own date-window check against the *stored*
 * record anyway, which is the only correct place for it: a patch that moves the start date past a
 * stored end date contains one date, and a two-date refinement passes it trivially.
 */
export const specialFields = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  blurb: z.string().trim().min(1, "Blurb is required").max(200),
  body: z.string().trim().max(2000).optional().nullable(),
  imageUrl: z.string().trim().max(500).optional().nullable(),
  ctaLabel: z.string().trim().max(60).optional().nullable(),
  /**
   * Site-relative only.
   *
   * An admin-editable field rendered into an anchor on every page is exactly the shape of a stored
   * redirect: an absolute URL here would let anyone with admin access - or anyone who got hold of
   * an admin session - point the site-wide bar at somewhere else entirely. Refusing anything that
   * does not begin with a single slash also refuses `//evil.com`, which browsers read as protocol-
   * relative and would otherwise sail through a naive "starts with /" check.
   */
  ctaHref: z.string().trim().max(300).regex(/^\/(?!\/)/, "Link must be a path on this site, like /services/window-decals").optional().nullable(),
  couponCode: z.string().trim().max(40).optional().nullable(),
  // Spanish copy. Optional throughout - an untranslated promotion falls back to English rather
  // than being blocked from publishing (see toPublic in lib/specials).
  titleEs: z.string().trim().max(120).optional().nullable(),
  blurbEs: z.string().trim().max(200).optional().nullable(),
  bodyEs: z.string().trim().max(2000).optional().nullable(),
  ctaLabelEs: z.string().trim().max(60).optional().nullable(),
  active: z.boolean().optional(),
  showInBar: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
});

/** The create schema: every field, plus the check that the dates make sense together. */
export const specialInput = specialFields.refine(
  (v) => !v.startsAt || !v.endsAt || new Date(v.startsAt) < new Date(v.endsAt),
  { path: ["endsAt"], message: "The end date must be after the start date" },
);

/** Empty strings from an untouched form field mean "not set", not "set to an empty string". */
export function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const specials = await db.special.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  return NextResponse.json(specials);
}

export async function POST(req: Request) {
  const { error, user: admin } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = specialInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const v = parsed.data;

  // Slug collisions are resolved by suffixing rather than rejected: two "Summer Sale" promotions in
  // consecutive years is an entirely reasonable thing to want, and failing the save over it would
  // make the admin invent a title it does not want to display.
  const base = slugifySpecial(v.title);
  let slug = base;
  for (let n = 2; await db.special.findUnique({ where: { slug } }); n++) slug = `${base}-${n}`;

  const special = await db.special.create({
    data: {
      slug,
      title: v.title,
      blurb: v.blurb,
      body: blankToNull(v.body),
      imageUrl: blankToNull(v.imageUrl),
      ctaLabel: blankToNull(v.ctaLabel),
      ctaHref: blankToNull(v.ctaHref),
      couponCode: blankToNull(v.couponCode)?.toUpperCase() ?? null,
      titleEs: blankToNull(v.titleEs),
      blurbEs: blankToNull(v.blurbEs),
      bodyEs: blankToNull(v.bodyEs),
      ctaLabelEs: blankToNull(v.ctaLabelEs),
      active: v.active ?? true,
      showInBar: v.showInBar ?? false,
      sortOrder: v.sortOrder ?? 0,
      startsAt: v.startsAt ? new Date(v.startsAt) : null,
      endsAt: v.endsAt ? new Date(v.endsAt) : null,
    },
  });

  await logAudit({
    userId: admin!.id, action: "special.create", entity: "Special", entityId: special.id,
    after: { slug, title: v.title }, ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json(special, { status: 201 });
}
