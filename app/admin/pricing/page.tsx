import { db } from "@/lib/prisma";
import { AdminPricingEditor } from "@/components/admin/AdminPricingEditor";
import { AdminPrintPricing } from "@/components/admin/AdminPrintPricing";
import { getPricingSettings } from "@/lib/pricing/settings-server";

export default async function AdminPricingPage() {
  const [packages, settings] = await Promise.all([
    db.packageTier.findMany({
      include: { product: true },
      orderBy: [{ product: { sortOrder: "asc" } }, { price: "asc" }],
    }),
    getPricingSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-kc-dark">Pricing</h1>
        <p className="text-sm text-kc-muted">
          Everything here is live the moment you save it — no deploy, no waiting.
        </p>
      </div>

      <AdminPrintPricing settings={settings} />

      <div className="space-y-3">
        <div>
          <h2 className="font-bold text-kc-dark">Design packages</h2>
          <p className="text-sm text-kc-muted">
            One-off design fees for customers who want us to make the artwork.
          </p>
        </div>
        <AdminPricingEditor packages={packages} />
      </div>
    </div>
  );
}
