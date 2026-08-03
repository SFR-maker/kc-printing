import Link from "next/link";
import { FileUp, Palette, Search, Truck } from "lucide-react";
import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { OrderStatusBadge, PaymentBadge } from "@/components/admin/OrderStatusBadge";
import { OPEN_STATUSES, PAID_STATUSES, STATUS_FLOW, STATUS_LABELS } from "@/lib/orders/status";
import { cn, formatDollars } from "@/lib/utils";

const PAGE_SIZE = 50;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = STATUS_FLOW.includes(params.status as OrderStatus) ? (params.status as OrderStatus) : undefined;
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  // Covers every way an order actually gets looked up: the short id quoted on the phone, the email
  // on the receipt, the name on the parcel, or a tracking number a customer is chasing.
  const search: Prisma.OrderWhereInput | undefined = q
    ? {
        OR: [
          { id: { contains: q, mode: "insensitive" } },
          { guestEmail: { contains: q, mode: "insensitive" } },
          { shippingName: { contains: q, mode: "insensitive" } },
          { trackingNumber: { contains: q, mode: "insensitive" } },
          { user: { is: { email: { contains: q, mode: "insensitive" } } } },
          { user: { is: { name: { contains: q, mode: "insensitive" } } } },
        ],
      }
    : undefined;

  const where: Prisma.OrderWhereInput = { ...(status ? { status } : {}), ...(search ?? {}) };

  const [orders, total, needsWork, awaitingPayment, revenue] = await Promise.all([
    db.order.findMany({
      where,
      include: { items: { include: { product: true } }, user: true },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    db.order.count({ where }),
    db.order.count({ where: { status: { in: OPEN_STATUSES } } }),
    db.order.count({ where: { status: "PENDING" } }),
    db.order.aggregate({ where: { status: { in: PAID_STATUSES } }, _sum: { amountPaid: true } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-kc-dark">Orders</h1>
          <p className="text-sm text-kc-muted">Everything ever placed, newest first.</p>
        </div>
        <div className="flex gap-5">
          <Stat label="Needs work" value={String(needsWork)} alert={needsWork > 0} />
          <Stat label="Awaiting payment" value={String(awaitingPayment)} />
          <Stat label="Collected" value={formatDollars(revenue._sum.amountPaid ?? 0)} />
        </div>
      </div>

      <form method="get" className="flex flex-wrap items-center gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kc-muted" strokeWidth={1.75} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search order id, email, name or tracking number"
            className="w-full rounded-lg border border-kc-border bg-white py-2 pl-9 pr-3 text-sm text-kc-dark placeholder:text-kc-muted focus:border-kc-teal focus:outline-none"
          />
        </div>
        <button type="submit" className="rounded-lg bg-kc-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-kc-teal/90">
          Search
        </button>
        {q && (
          <Link href={status ? `/admin/orders?status=${status}` : "/admin/orders"} className="text-sm text-kc-muted hover:text-kc-dark">
            Clear
          </Link>
        )}
      </form>

      <div className="flex flex-wrap gap-2">
        <FilterChip href={q ? `/admin/orders?q=${encodeURIComponent(q)}` : "/admin/orders"} active={!status} label="All" />
        {STATUS_FLOW.map((s) => (
          <FilterChip
            key={s}
            href={`/admin/orders?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            active={status === s}
            label={STATUS_LABELS[s]}
          />
        ))}
      </div>

      <Card className="border-kc-border">
        <CardContent className="overflow-x-auto p-0">
          {orders.length === 0 ? (
            <p className="p-12 text-center text-sm text-kc-muted">
              {q || status ? "No orders match that filter." : "No orders yet."}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-kc-border bg-kc-bg text-xs text-kc-muted">
                  {["Order", "Customer", "Product", "Total", "Payment", "Status", "Placed"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-kc-border">
                {orders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-kc-bg">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs font-semibold text-kc-teal hover:underline">
                        #{order.id.slice(-8)}
                      </Link>
                      <div className="mt-1 flex items-center gap-1.5 text-kc-muted">
                        {order.artworkPath === "UPLOAD" ? (
                          <FileUp className="h-3.5 w-3.5" strokeWidth={1.75} aria-label="Customer supplied the artwork" />
                        ) : (
                          <Palette className="h-3.5 w-3.5" strokeWidth={1.75} aria-label="We design it" />
                        )}
                        {order.trackingNumber && (
                          <Truck className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.75} aria-label="Despatched" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-kc-dark">{order.user?.name ?? order.shippingName ?? "—"}</div>
                      <div className="text-xs text-kc-muted">{order.user?.email ?? order.guestEmail ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-kc-muted">
                      <div>{order.items[0]?.product?.name ?? "—"}</div>
                      {order.items[0] && (
                        <div className="text-xs">{order.items[0].quantity.toLocaleString()} units</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-kc-dark">{formatDollars(order.total)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <PaymentBadge stripePaymentStatus={order.stripePaymentStatus} amountPaid={order.amountPaid} />
                    </td>
                    <td className="px-4 py-3"><OrderStatusBadge status={order.status} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-kc-muted">
                      {new Date(order.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-kc-muted">Page {page} of {pages} — {total} orders</span>
          <div className="flex gap-2">
            {page > 1 && <PageLink page={page - 1} status={status} q={q} label="Previous" />}
            {page < pages && <PageLink page={page + 1} status={status} q={q} label="Next" />}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="text-right">
      <div className={cn("text-xl font-black", alert ? "text-kc-magenta-deep" : "text-kc-dark")}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-kc-muted">{label}</div>
    </div>
  );
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs transition-colors",
        active ? "border-kc-teal bg-kc-teal text-white" : "border-kc-border text-kc-muted hover:border-kc-teal/40"
      )}
    >
      {label}
    </Link>
  );
}

function PageLink({ page, status, q, label }: { page: number; status?: string; q: string; label: string }) {
  const sp = new URLSearchParams();
  if (status) sp.set("status", status);
  if (q) sp.set("q", q);
  sp.set("page", String(page));
  return (
    <Link href={`/admin/orders?${sp}`} className="rounded-lg border border-kc-border px-3 py-1.5 text-kc-dark transition-colors hover:border-kc-teal/40">
      {label}
    </Link>
  );
}
