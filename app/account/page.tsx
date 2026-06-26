import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/prisma";
import { Package, FolderOpen, Files, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function AccountDashboard() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/sign-in");

  const [orders, projects] = await Promise.all([
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5, include: { items: { include: { product: true } } } }),
    db.project.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const stats = {
    totalOrders: await db.order.count({ where: { userId: user.id } }),
    activeProjects: await db.project.count({ where: { userId: user.id, status: { in: ["PENDING", "IN_PROGRESS", "REVIEW", "REVISION"] } } }),
    completedProjects: await db.project.count({ where: { userId: user.id, status: "COMPLETE" } }),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-kc-dark">Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
        <p className="text-kc-muted text-sm">Manage your orders, projects, and files.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Orders", value: stats.totalOrders, icon: Package, href: "/account/orders" },
          { label: "Active Projects", value: stats.activeProjects, icon: FolderOpen, href: "/account/projects" },
          { label: "Completed", value: stats.completedProjects, icon: Files, href: "/account/projects" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="border-kc-border hover:border-kc-teal/30 transition-colors">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-kc-teal/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-kc-teal" />
                </div>
                <div>
                  <div className="text-2xl font-black text-kc-dark">{stat.value}</div>
                  <div className="text-xs text-kc-muted">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-kc-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-kc-dark">Recent Orders</h2>
              <Link href="/account/orders" className="text-xs text-kc-teal hover:underline">View all</Link>
            </div>
            {orders.length === 0 ? (
              <p className="text-sm text-kc-muted">No orders yet.</p>
            ) : (
              <ul className="space-y-3">
                {orders.map((order) => (
                  <li key={order.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-kc-dark">
                        {order.items[0]?.product?.name ?? "Order"}
                      </div>
                      <div className="text-xs text-kc-muted">{new Date(order.createdAt).toLocaleDateString()}</div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        order.status === "PAID" || order.status === "COMPLETE" ? "bg-kc-sage/20 text-kc-teal border-0" :
                        order.status === "PENDING" ? "bg-kc-yellow/30 text-kc-dark border-0" :
                        "bg-kc-bg text-kc-muted border-kc-border"
                      }
                    >
                      {order.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-kc-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-kc-dark">Active Projects</h2>
              <Link href="/account/projects" className="text-xs text-kc-teal hover:underline">View all</Link>
            </div>
            {projects.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-kc-muted mb-3">No active projects.</p>
                <Button asChild size="sm" className="bg-kc-coral hover:bg-kc-coral/90 text-white">
                  <Link href="/services">Start an Order <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {projects.map((project) => (
                  <li key={project.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-kc-dark">Project {project.id.slice(-6)}</div>
                      <div className="text-xs text-kc-muted">{new Date(project.createdAt).toLocaleDateString()}</div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        project.status === "COMPLETE" ? "bg-kc-sage/20 text-kc-teal border-0" :
                        project.status === "IN_PROGRESS" ? "bg-kc-teal/10 text-kc-teal border-0" :
                        project.status === "REVIEW" ? "bg-kc-yellow/30 text-kc-dark border-0" :
                        "bg-kc-bg text-kc-muted border-kc-border"
                      }
                    >
                      {project.status.replace("_", " ")}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
