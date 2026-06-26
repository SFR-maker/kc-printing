import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDollars } from "@/lib/utils";

export default async function OrdersPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/sign-in");

  const orders = await db.order.findMany({
    where: { userId: user.id },
    include: { items: { include: { product: true, packageTier: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-kc-dark">My Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-kc-muted mb-4">No orders yet.</p>
          <Link href="/services" className="text-kc-teal hover:underline text-sm font-medium">Browse Services</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/account/orders/${order.id}`}>
              <Card className="border-kc-border hover:border-kc-teal/30 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-kc-dark">
                      {order.items.map((i) => i.product.name).join(", ") || "Order"}
                    </div>
                    <div className="text-xs text-kc-muted">
                      {new Date(order.createdAt).toLocaleDateString()} - Order #{order.id.slice(-8)}
                    </div>
                    {order.items[0]?.packageTier && (
                      <div className="text-xs text-kc-muted">{order.items[0].packageTier.name} Package</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-bold text-kc-dark">{formatDollars(order.total)}</div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        order.status === "COMPLETE" ? "bg-kc-sage/20 text-kc-teal border-0" :
                        order.status === "PAID" || order.status === "IN_PROGRESS" ? "bg-kc-teal/10 text-kc-teal border-0" :
                        order.status === "PENDING" ? "bg-kc-yellow/30 text-kc-dark border-0" :
                        "bg-kc-bg text-kc-muted border-kc-border"
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
