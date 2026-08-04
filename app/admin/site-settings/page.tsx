import { db } from "@/lib/prisma";
import { AdminSettingsForm } from "@/components/admin/AdminSettingsForm";
import Link from "next/link";
import { PRICING_KEYS } from "@/lib/pricing/settings";

export default async function AdminSiteSettingsPage() {
  // Pricing keys are edited on /admin/pricing, which validates them. Raw text boxes here would let
  // someone paste malformed JSON straight into the live shipping table.
  const settings = await db.siteSetting.findMany({
    where: { key: { notIn: Object.values(PRICING_KEYS) } },
    orderBy: { key: "asc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-kc-dark">Site Settings</h1>
      <p className="text-sm text-kc-muted">
        Prices and shipping live on the{" "}
        <Link href="/admin/pricing" className="font-semibold text-kc-teal hover:underline">Pricing</Link>{" "}
        page, where the values are checked before they go live.
      </p>
      <AdminSettingsForm settings={settings} />
    </div>
  );
}
