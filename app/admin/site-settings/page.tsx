import { db } from "@/lib/prisma";
import { AdminSettingsForm } from "@/components/admin/AdminSettingsForm";

export default async function AdminSiteSettingsPage() {
  const settings = await db.siteSetting.findMany({ orderBy: { key: "asc" } });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-kc-dark">Site Settings</h1>
      <AdminSettingsForm settings={settings} />
    </div>
  );
}
