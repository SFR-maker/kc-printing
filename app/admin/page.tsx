import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock, DollarSign, FileUp, Package, Truck } from "lucide-react";
import { db } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { OrderStatusBadge, PaymentBadge } from "@/components/admin/OrderStatusBadge";
import { OPEN_STATUSES, PAID_STATUSES } from "@/lib/orders/status";
import { cn, formatDollars } from "@/lib/utils";

export default async function AdminDashboard() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    queue, awaitingPayment, unapprovedProofs, readyToShip,
    revenueAll, revenueMonth, recentOrders,
  ] = await Promise.all([
    db.order.findMany({
      where: { status: { in: OPEN_STATUSES } },
      include: { items: { include: { product: true } }, user: true },
      orderBy: { createdAt: "asc" },
      take: 8,
    }),
    db.order.count({ where: { status: "PENDING" } }),
    // Paid, customer-supplied artwork with no approval on record. Printing one of these means
    // printing something nobody signed off, which is the expensive kind of mistake.
    db.order.count({
      where: { status: { in: PAID_STATUSES }, artworkPath: "UPLOAD", proofApprovedAt: null },
    }),
    db.order.count({ where: { status: { in: ["PAID", "IN_PROGRESS"] }, trackingNumber: null } }),
    db.order.aggregate({ where: { status: { in: PAID_STATUSES } }, _sum: { amountPaid: true }, _count: true }),
    db.order.aggregate({
      where: { status: { in: PAID_STATUSES }, createdAt: { gte: monthStart } },
      _sum: { amountPaid: true }, _count: true,
    }),
    db.order.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { items: { include: { product: true } }, user: true },
    }),
  ]);

  const monthLabel = monthStart.toLocaleDateString(undefined, { month: "long" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-kc-dark">Today at KC Printing</h1>
        <p className="text-sm text-kc-muted">What needs doing, and what the shop has taken.</p>
      </div>

      {unapprovedProofs > 0 && (
        <Link
          href="/admin/orders?status=PAID"
          className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 transition-colors hover:border-amber-400"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" strokeWidth={1.75} />
          <span className="text-sm text-amber-900">
            <span className="font-bold">
              {unapprovedProofs} paid {unapprovedProofs === 1 ? "order has" : "orders have"} no approved proof.
            </span>{" "}
            Do not print these until the customer has approved the placement.
          </span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat icon={DollarSign} label="Collected all time" value={formatDollars(revenueAll._sum.amountPaid ?? 0)} sub={`${revenueAll._count} paid orders`} />
        <Stat icon={DollarSign} label={`Collected in ${monthLabel}`} value={formatDollars(revenueMonth._sum.amountPaid ?? 0)} sub={`${revenueMonth._count} orders`} />
        <Stat icon={Package} label="In your queue" value={String(queue.length)} sub="paid, not finished" alert={queue.length > 0} href="/admin/orders?status=PAID" />
        <Stat icon={Truck} label="Ready to ship" value={String(readyToShip)} sub="no tracking yet" href="/admin/orders?status=IN_PROGRESS" />
        <Stat icon={Clock} label="Awaiting payment" value={String(awaitingPayment)} sub="checkout not finished" href="/admin/orders?status=PENDING" />
      </div>

      <Card className="border-kc-border">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-kc-dark">Work queue — oldest first</h2>
            <Link href="/admin/orders" className="inline-flex items-center gap-1 text-xs text-kc-teal hover:underline">
              All orders <ArrowRight className="h-3 w-3" strokeWidth={1.75} />
            </Link>
          </div>
          {queue.length === 0 ? (
            <p className="py-8 text-center text-sm text-kc-muted">Nothing waiting. Everything paid for is finished.</p>
          ) : (
            <ul className="divide-y divide-kc-border">
              {queue.map((order) => {
                const days = Math.floor((now.getTime() - new Date(order.createdAt).getTime()) / 86_400_000);
                return (
                  <li key={order.id}>
                    <Link href={`/admin/orders/${order.id}`} className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-kc-bg">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-kc-teal">#{order.id.slice(-8)}</span>
                          {order.artworkPath === "UPLOAD" && <FileUp className="h-3.5 w-3.5 text-kc-muted" strokeWidth={1.75} />}
                          {order.artworkPath === "UPLOAD" && !order.proofApprovedAt && (
                            <span className="text-[11px] font-bold uppercase text-amber-700">proof not approved</span>
                          )}
                        </div>
                        <div className="truncate text-sm text-kc-dark">
                          {order.items[0]?.product?.name ?? "Order"} · {order.user?.email ?? order.guestEmail ?? "guest"}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className={cn("text-xs", days >= 5 ? "font-semibold text-kc-magenta-deep" : "text-kc-muted")}>
                          {days === 0 ? "today" : `${days}d old`}
                        </span>
                        <OrderStatusBadge status={order.status} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-kc-border">
        <CardContent className="p-5">
          <h2 className="mb-4 font-bold text-kc-dark">Latest orders</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-kc-border text-xs text-kc-muted">
                  {["Order", "Customer", "Total", "Payment", "Status", "Placed"].map((h) => (
                    <th key={h} className="whitespace-nowrap pb-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-kc-border">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-kc-bg">
                    <td className="py-2.5">
                      <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs font-semibold text-kc-teal hover:underline">
                        #{order.id.slice(-8)}
                      </Link>
                    </td>
                    <td className="py-2.5 text-kc-dark">{order.user?.email ?? order.guestEmail ?? "—"}</td>
                    <td className="py-2.5 font-semibold text-kc-dark">{formatDollars(order.total)}</td>
                    <td className="py-2.5"><PaymentBadge stripePaymentStatus={order.stripePaymentStatus} amountPaid={order.amountPaid} /></td>
                    <td className="py-2.5"><OrderStatusBadge status={order.status} /></td>
                    <td className="whitespace-nowrap py-2.5 text-xs text-kc-muted">
                      {new Date(order.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentOrders.length === 0 && <p className="py-8 text-center text-sm text-kc-muted">No orders yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon, label, value, sub, alert = false, href,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string; value: string; sub: string; alert?: boolean; href?: string;
}) {
  const body = (
    <CardContent className="p-4">
      <Icon className={cn("mb-2 h-5 w-5", alert ? "text-kc-magenta-deep" : "text-kc-muted")} strokeWidth={1.75} />
      <div className={cn("text-xl font-black", alert ? "text-kc-magenta-deep" : "text-kc-dark")}>{value}</div>
      <div className="text-xs font-medium text-kc-dark">{label}</div>
      <div className="text-[11px] text-kc-muted">{sub}</div>
    </CardContent>
  );
  return href ? (
    <Link href={href}>
      <Card className="h-full border-kc-border transition-colors hover:border-kc-teal/40">{body}</Card>
    </Link>
  ) : (
    <Card className="h-full border-kc-border">{body}</Card>
  );
}
