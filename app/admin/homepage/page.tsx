import { db } from "@/lib/prisma";
import { AdminHomepageEditor } from "@/components/admin/AdminHomepageEditor";

export default async function AdminHomepagePage() {
  const settings = await db.siteSetting.findMany({
    where: { key: { in: ["hero_headline", "hero_subheadline", "hero_cta", "stat_clients", "stat_score", "stat_traffic", "stat_rating"] } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-kc-dark">Homepage Editor</h1>
      <AdminHomepageEditor settings={settings} />
    </div>
  );
}
