import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { AdminProjectActions } from "@/components/admin/AdminProjectActions";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { formatDollars } from "@/lib/utils";

export default async function AdminProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    include: {
      user: true,
      order: { include: { items: { include: { product: true, packageTier: true } } } },
      revisionRequests: { include: { user: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!project) notFound();

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/admin/projects" className="inline-flex items-center gap-1.5 text-sm text-kc-muted hover:text-kc-dark">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> All design jobs
      </Link>

      <div>
        <h1 className="text-2xl font-black text-kc-dark">Design job #{project.id.slice(-8)}</h1>
        <p className="text-sm text-kc-muted">
          Started {new Date(project.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
        </p>
      </div>

      <Card className="border-kc-border">
        <CardContent className="space-y-2 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-kc-dark">The order this belongs to</h2>
            <Link href={`/admin/orders/${project.orderId}`} className="text-xs font-semibold text-kc-teal hover:underline">
              Open order #{project.orderId.slice(-8)}
            </Link>
          </div>
          <p className="text-sm">
            <span className="text-kc-muted">Customer: </span>
            <span className="text-kc-dark">
              {project.user?.name ?? project.user?.email ?? project.order.guestEmail ?? "—"}
            </span>
          </p>
          <p className="text-sm">
            <span className="text-kc-muted">Ordered: </span>
            <span className="text-kc-dark">
              {project.order.items[0]?.product?.name ?? "—"}
              {project.order.items[0]?.packageTier && ` — ${project.order.items[0].packageTier.name}`}
              {" · "}
              {formatDollars(project.order.total)}
            </span>
          </p>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-sm text-kc-muted">Order status:</span>
            <OrderStatusBadge status={project.order.status} />
          </div>
        </CardContent>
      </Card>

      <AdminProjectActions
        projectId={project.id}
        currentStatus={project.status}
        notes={project.notes}
        revisions={project.revisionRequests.map((r) => ({
          id: r.id,
          message: r.message,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          author: r.user?.name ?? r.user?.email ?? "Customer",
        }))}
      />
    </div>
  );
}
