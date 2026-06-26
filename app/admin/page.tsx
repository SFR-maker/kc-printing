import { db } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Users, FolderKanban, DollarSign, TrendingUp, Clock } from "lucide-react";
import { formatDollars } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function AdminDashboard() {
  const [
    totalOrders,
    pendingOrders,
    totalRevenue,
    totalUsers,
    activeProjects,
    recentOrders,
  ] = await Promise.all([
    db.order.count(),
    db.order.count({ where: { status: { in: ["PENDING", "PAID"] } } }),
    db.order.aggregate({ where: { status: { in: ["PAID", "IN_PROGRESS", "REVIEW", "COMPLETE"] } }, _sum: { total: true } }),
    db.user.count(),
    db.project.count({ where: { status: { in: ["PENDING", "IN_PROGRESS", "REVIEW", "REVISION"] } } }),
    db.order.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { items: { include: { product: true } }, user: true } }),
  ]);

  const stats = [
    { label: "Total Revenue", value: formatDollars(totalRevenue._sum.total ?? 0), icon: DollarSign, color: "text-kc-teal" },
    { label: "Total Orders", value: totalOrders, icon: Package, color: "text-kc-coral" },
    { label: "Active Projects", value: activeProjects, icon: FolderKanban, color: "text-kc-yellow" },
    { label: "Total Users", value: totalUsers, icon: Users, color: "text-kc-sage" },
    { label: "Pending Orders", value: pendingOrders, icon: Clock, color: "text-kc-muted" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-kc-dark">Admin Dashboard</h1>
        <p className="text-kc-muted text-sm">Manage KC Printing operations.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-kc-border">
            <CardContent className="p-4">
              <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
              <div className="text-xl font-black text-kc-dark">{stat.value}</div>
              <div className="text-xs text-kc-muted">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-kc-border">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-kc-dark">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs text-kc-teal hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-kc-border text-xs text-kc-muted">
                  <th className="text-left pb-2 font-medium">Order</th>
                  <th className="text-left pb-2 font-medium">Customer</th>
                  <th className="text-left pb-2 font-medium">Service</th>
                  <th className="text-left pb-2 font-medium">Total</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                  <th className="text-left pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kc-border">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-kc-bg transition-colors">
                    <td className="py-2.5">
                      <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs text-kc-teal hover:underline">
                        #{order.id.slice(-8)}
                      </Link>
                    </td>
                    <td className="py-2.5 text-kc-dark">{order.user?.name ?? order.user?.email ?? "Unknown"}</td>
                    <td className="py-2.5 text-kc-muted">{order.items[0]?.product?.name ?? "-"}</td>
                    <td className="py-2.5 font-medium text-kc-dark">{formatDollars(order.total)}</td>
                    <td className="py-2.5">
                      <Badge
                        variant="secondary"
                        className={
                          order.status === "COMPLETE" ? "bg-kc-sage/20 text-kc-teal border-0 text-xs" :
                          order.status === "PAID" ? "bg-kc-teal/10 text-kc-teal border-0 text-xs" :
                          order.status === "PENDING" ? "bg-kc-yellow/30 text-kc-dark border-0 text-xs" :
                          "bg-kc-bg text-kc-muted border-kc-border text-xs"
                        }
                      >
                        {order.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-kc-muted text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
