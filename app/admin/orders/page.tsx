import { db } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDollars } from "@/lib/utils";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const where = params.status ? { status: params.status as "DRAFT" | "PENDING" | "PAID" | "IN_PROGRESS" | "REVIEW" | "COMPLETE" | "CANCELLED" } : {};

  const orders = await db.order.findMany({
    where,
    include: { items: { include: { product: true } }, user: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const statuses = ["DRAFT", "PENDING", "PAID", "IN_PROGRESS", "REVIEW", "COMPLETE", "CANCELLED"];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-kc-dark">Orders</h1>
      <div className="flex gap-2 flex-wrap">
        <Link href="/admin/orders" className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!params.status ? "bg-kc-teal text-white border-kc-teal" : "border-kc-border text-kc-muted hover:border-kc-teal/40"}`}>All</Link>
        {statuses.map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${params.status === s ? "bg-kc-teal text-white border-kc-teal" : "border-kc-border text-kc-muted hover:border-kc-teal/40"}`}>
            {s}
          </Link>
        ))}
      </div>
      <Card className="border-kc-border">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-kc-border bg-kc-bg text-xs text-kc-muted">
                {["Order", "Customer", "Service", "Package", "Total", "Status", "Date", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-kc-border">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-kc-bg transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-kc-teal">#{order.id.slice(-8)}</td>
                  <td className="px-4 py-3 text-kc-dark">{order.user?.name ?? order.user?.email ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-kc-muted">{order.items[0]?.product?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-kc-muted">{order.items[0]?.packageTierId ? "Package" : "-"}</td>
                  <td className="px-4 py-3 font-medium text-kc-dark">{formatDollars(order.total)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-xs border-0 bg-kc-bg text-kc-muted">{order.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-kc-muted text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${order.id}`} className="text-xs text-kc-teal hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <p className="text-center py-8 text-kc-muted text-sm">No orders found.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
