import { db } from "@/lib/prisma";
import { AdminPricingEditor } from "@/components/admin/AdminPricingEditor";

export default async function AdminPricingPage() {
  const packages = await db.packageTier.findMany({
    include: { product: true },
    orderBy: [{ product: { sortOrder: "asc" } }, { price: "asc" }],
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-kc-dark">Pricing Editor</h1>
      <AdminPricingEditor packages={packages} />
    </div>
  );
}
