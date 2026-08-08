import { db } from "@/lib/prisma";
import { AdminSpecialsEditor, type AdminSpecial } from "@/components/admin/AdminSpecialsEditor";

export const dynamic = "force-dynamic";

export default async function AdminSpecialsPage() {
  const rows = await db.special.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });

  // Dates are serialised to ISO for the client component; a Date cannot cross that boundary, and
  // the editor's datetime-local inputs work in strings anyway.
  const specials: AdminSpecial[] = rows.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    blurb: s.blurb,
    body: s.body,
    imageUrl: s.imageUrl,
    ctaLabel: s.ctaLabel,
    ctaHref: s.ctaHref,
    couponCode: s.couponCode,
    titleEs: s.titleEs,
    blurbEs: s.blurbEs,
    bodyEs: s.bodyEs,
    ctaLabelEs: s.ctaLabelEs,
    active: s.active,
    showInBar: s.showInBar,
    sortOrder: s.sortOrder,
    startsAt: s.startsAt?.toISOString() ?? null,
    endsAt: s.endsAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-kc-dark">Specials</h1>
        <p className="mt-1 text-sm text-kc-muted">
          Promotions shown on the Specials page, and in the bar at the top of every page. Set dates
          and a special starts and stops on its own.
        </p>
      </div>
      <AdminSpecialsEditor initial={specials} />
    </div>
  );
}
