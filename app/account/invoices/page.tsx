import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDollars } from "@/lib/utils";
import { FileText } from "lucide-react";

export default async function InvoicesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/sign-in");

  const orders = await db.order.findMany({
    where: { userId: user.id, status: { in: ["PAID", "IN_PROGRESS", "REVIEW", "COMPLETE"] } },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-kc-dark">Invoices</h1>
      {orders.length === 0 ? (
        <p className="text-kc-muted text-sm">No invoices yet. Invoices appear after a payment is completed.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/account/invoices/${order.id}`}>
              <Card className="border-kc-border hover:border-kc-teal/30 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-kc-teal/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-kc-teal" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-kc-dark">
                      Invoice #{order.id.slice(-8).toUpperCase()}
                    </div>
                    <div className="text-xs text-kc-muted">
                      {order.items.map((i) => i.product.name).join(", ")} - {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-kc-dark">{formatDollars(order.total)}</span>
                    <Badge className="bg-kc-sage/20 text-kc-teal border-0">Paid</Badge>
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
