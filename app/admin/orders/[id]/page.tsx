import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDollars } from "@/lib/utils";
import { AdminOrderActions } from "@/components/admin/AdminOrderActions";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: true,
      items: { include: { product: true, packageTier: true } },
      project: { include: { revisionRequests: true } },
      coupon: true,
    },
  });

  if (!order) notFound();

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-kc-dark">Order #{order.id.slice(-8)}</h1>
        <Badge variant="secondary" className="text-sm border-0 bg-kc-bg text-kc-muted">{order.status}</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-kc-border">
          <CardContent className="p-4 space-y-2">
            <h3 className="font-semibold text-kc-dark text-sm">Customer</h3>
            <p className="text-sm text-kc-muted">{order.user?.name ?? "Unknown"}</p>
            <p className="text-sm text-kc-muted">{order.user?.email}</p>
          </CardContent>
        </Card>
        <Card className="border-kc-border">
          <CardContent className="p-4 space-y-2">
            <h3 className="font-semibold text-kc-dark text-sm">Payment</h3>
            <p className="text-sm text-kc-muted">Total: <span className="font-bold text-kc-dark">{formatDollars(order.total)}</span></p>
            {order.coupon && <p className="text-sm text-kc-muted">Coupon: {order.coupon.code}</p>}
            {order.stripePaymentStatus && <p className="text-sm text-kc-muted">Stripe: {order.stripePaymentStatus}</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="border-kc-border">
        <CardContent className="p-4">
          <h3 className="font-semibold text-kc-dark text-sm mb-3">Order Items</h3>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-kc-dark">{item.product.name}</span>
                  {item.packageTier && <span className="text-kc-muted"> - {item.packageTier.name}</span>}
                  <span className="text-kc-muted"> x{item.quantity}</span>
                </div>
                <span className="font-medium text-kc-dark">{formatDollars(item.price)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {order.notes && (
        <Card className="border-kc-border">
          <CardContent className="p-4">
            <h3 className="font-semibold text-kc-dark text-sm mb-2">Customer Notes</h3>
            <p className="text-sm text-kc-muted whitespace-pre-wrap">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      <AdminOrderActions orderId={order.id} currentStatus={order.status} />
    </div>
  );
}
