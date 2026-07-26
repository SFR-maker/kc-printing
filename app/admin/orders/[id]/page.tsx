import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDollars } from "@/lib/utils";
import { AdminOrderActions } from "@/components/admin/AdminOrderActions";
import { FileIcon } from "lucide-react";

interface ItemConfig {
  businessName?: string;
  phone?: string;
  email?: string;
  website?: string;
  linkedin?: string;
  brandColorsNotes?: string;
  notes?: string;
  brandFiles?: { url: string; name: string }[];
}

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
            <p className="text-sm text-kc-muted">{order.user?.name ?? (order.guestEmail ? "Guest" : "Unknown")}</p>
            <p className="text-sm text-kc-muted">{order.user?.email ?? order.guestEmail}</p>
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

      {order.items.map((item) => {
        const config = (item.config ?? {}) as ItemConfig;
        const hasDetails = config.businessName || config.phone || config.email || config.website || config.linkedin || config.brandColorsNotes || config.notes || (config.brandFiles?.length ?? 0) > 0;
        if (!hasDetails) return null;
        return (
          <Card key={item.id} className="border-kc-border">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-kc-dark text-sm">Project Details {order.items.length > 1 && `(${item.product.name})`}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {config.businessName && <p><span className="text-kc-muted">Business:</span> <span className="text-kc-dark">{config.businessName}</span></p>}
                {config.phone && <p><span className="text-kc-muted">Phone:</span> <span className="text-kc-dark">{config.phone}</span></p>}
                {config.email && <p><span className="text-kc-muted">Email:</span> <span className="text-kc-dark">{config.email}</span></p>}
                {config.website && <p><span className="text-kc-muted">Website:</span> <span className="text-kc-dark">{config.website}</span></p>}
                {config.linkedin && <p><span className="text-kc-muted">LinkedIn:</span> <span className="text-kc-dark">{config.linkedin}</span></p>}
                {config.brandColorsNotes && <p><span className="text-kc-muted">Brand Colors:</span> <span className="text-kc-dark">{config.brandColorsNotes}</span></p>}
              </div>
              {config.notes && (
                <div className="text-sm">
                  <span className="text-kc-muted">Project Notes</span>
                  <p className="mt-1 text-kc-dark whitespace-pre-wrap">{config.notes}</p>
                </div>
              )}
              {config.brandFiles && config.brandFiles.length > 0 && (
                <div className="text-sm">
                  <span className="text-kc-muted block mb-1.5">Brand Files</span>
                  <ul className="space-y-1.5">
                    {config.brandFiles.map((f) => (
                      <li key={f.url}>
                        <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg border border-kc-border bg-kc-bg px-3 py-2 text-xs text-kc-teal hover:underline w-fit">
                          <FileIcon className="h-3.5 w-3.5 shrink-0" />
                          {f.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <AdminOrderActions orderId={order.id} currentStatus={order.status} />
    </div>
  );
}
