import { db } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDollars } from "@/lib/utils";
import { AdminCouponForm } from "@/components/admin/AdminCouponForm";

export default async function AdminCouponsPage() {
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-kc-dark">Coupons</h1>
      <AdminCouponForm />
      <Card className="border-kc-border">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-kc-border bg-kc-bg text-xs text-kc-muted">
                {["Code", "Discount", "Type", "Usage", "Expires", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-kc-border">
              {coupons.map((c) => (
                <tr key={c.id} className="hover:bg-kc-bg transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-kc-dark">{c.code}</td>
                  <td className="px-4 py-3 text-kc-dark">
                    {c.type === "PERCENT" ? `${c.discount}%` : formatDollars(c.discount)}
                  </td>
                  <td className="px-4 py-3 text-kc-muted">{c.type}</td>
                  <td className="px-4 py-3 text-kc-muted">
                    {c.usageCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}
                  </td>
                  <td className="px-4 py-3 text-kc-muted text-xs">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={`text-xs border-0 ${c.active ? "bg-kc-sage/20 text-kc-teal" : "bg-kc-bg text-kc-muted"}`}>
                      {c.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <form action={async () => {
                      "use server";
                      await db.coupon.update({ where: { id: c.id }, data: { active: !c.active } });
                    }}>
                      <button type="submit" className="text-xs text-kc-teal hover:underline">
                        {c.active ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {coupons.length === 0 && <p className="text-center py-8 text-kc-muted text-sm">No coupons yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
