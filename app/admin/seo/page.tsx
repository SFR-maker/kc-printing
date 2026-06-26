import { db } from "@/lib/prisma";
import { AdminSeoEditor } from "@/components/admin/AdminSeoEditor";

export default async function AdminSeoPage() {
  const pages = await db.pageSeo.findMany({ orderBy: { path: "asc" } });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-kc-dark">SEO Editor</h1>
      <p className="text-kc-muted text-sm">Edit meta titles, descriptions, and Open Graph tags for each page.</p>
      <AdminSeoEditor pages={pages} />
    </div>
  );
}
