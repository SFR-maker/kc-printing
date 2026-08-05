import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, CreditCard, ExternalLink, FileIcon, Flag, PenLine, Truck } from "lucide-react";
import { db } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { AdminOrderActions } from "@/components/admin/AdminOrderActions";
import { OrderStatusBadge, PaymentBadge } from "@/components/admin/OrderStatusBadge";
import { formatDollars } from "@/lib/utils";

interface ItemConfig {
  businessName?: string;
  phone?: string;
  email?: string;
  website?: string;
  linkedin?: string;
  brandColorsNotes?: string;
  notes?: string;
  brandFiles?: { url: string; name: string }[];
  testOrder?: boolean;
  bcSpec?: { quantity?: number; rush?: boolean; roundCorners?: boolean; manualProof?: boolean };
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: true,
      cardDesign: { select: { id: true, title: true, product: true, thumbnailFront: true, thumbnailBack: true, updatedAt: true } },
      items: { include: { product: true, packageTier: true } },
      project: { include: { revisionRequests: true } },
      coupon: true,
      events: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) notFound();

  const isTest = order.items.some((i) => (i.config as ItemConfig)?.testOrder === true);
  const shippingLines = [
    order.shippingName,
    order.shippingLine1,
    order.shippingLine2,
    [order.shippingCity, order.shippingState, order.shippingPostalCode].filter(Boolean).join(", "),
    order.shippingCountry,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-5">
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-kc-muted hover:text-kc-dark">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> All orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-kc-dark">Order #{order.id.slice(-8)}</h1>
          <p className="text-sm text-kc-muted">
            Placed {new Date(order.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isTest && (
            <span className="rounded-full border-2 border-dashed border-kc-dark bg-kc-yellow/40 px-3 py-1 text-xs font-black uppercase tracking-wide text-kc-dark">
              Test order
            </span>
          )}
          <OrderStatusBadge status={order.status} className="text-sm" />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Panel title="Customer">
              <Row label="Name">{order.user?.name ?? order.shippingName ?? (order.guestEmail ? "Guest" : "—")}</Row>
              <Row label="Email">{order.user?.email ?? order.guestEmail ?? "—"}</Row>
              <Row label="Account">{order.user ? "Registered" : "Guest checkout"}</Row>
            </Panel>

            <Panel title="Payment">
              <Row label="Order total">{formatDollars(order.total)}</Row>
              {order.taxAmount != null && <Row label="Sales tax">{formatDollars(order.taxAmount)}</Row>}
              <Row label="Actually charged">
                <PaymentBadge stripePaymentStatus={order.stripePaymentStatus} amountPaid={order.amountPaid} />
              </Row>
              {order.coupon && <Row label="Coupon">{order.coupon.code}</Row>}
              {order.stripeSessionId && (
                <a
                  href={`https://dashboard.stripe.com/payments?query=${order.stripeSessionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-kc-magenta-deep hover:text-kc-dark"
                >
                  <CreditCard className="h-3.5 w-3.5" strokeWidth={1.75} /> Open in Stripe
                  <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
                </a>
              )}
            </Panel>
          </div>

          <Panel title="Deliver to">
            {shippingLines.length > 0 ? (
              <address className="text-sm not-italic leading-relaxed text-kc-dark">
                {shippingLines.map((line) => <div key={line}>{line}</div>)}
              </address>
            ) : (
              <p className="text-sm text-kc-muted">
                No address yet — Stripe collects it at checkout, so it appears once payment completes.
              </p>
            )}
            {order.trackingNumber && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-700">
                <Truck className="h-4 w-4" strokeWidth={1.75} />
                {order.trackingCarrier ? `${order.trackingCarrier} — ` : ""}{order.trackingNumber}
                {order.shippedAt && (
                  <span className="text-kc-muted">· sent {new Date(order.shippedAt).toLocaleDateString()}</span>
                )}
              </p>
            )}
          </Panel>

          <Panel title="What to print">
            <div className="space-y-2">
              {order.items.map((item) => {
                const spec = (item.config as ItemConfig)?.bcSpec;
                return (
                  <div key={item.id} className="flex items-start justify-between gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-kc-dark">{item.product.name}</span>
                      {item.packageTier && <span className="text-kc-muted"> — {item.packageTier.name}</span>}
                      <div className="text-xs text-kc-muted">
                        {item.quantity.toLocaleString()} units
                        {spec?.rush && " · RUSH"}
                        {spec?.roundCorners && " · rounded corners"}
                        {spec?.manualProof && " · manual proof"}
                      </div>
                    </div>
                    <span className="shrink-0 font-semibold text-kc-dark">{formatDollars(item.price)}</span>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Artwork">
            {order.cardDesign ? (
              /*
               * A Design Studio order has no uploaded file - the design itself is the artwork - so
               * the upload panel below would show nothing at all and production had no way to get
               * the print file. Both faces are shown, with the PDF the press needs and per-side
               * PNGs, rendered from the stored design on demand.
               */
              <div className="space-y-3 text-sm">
                <Row label="Source">Built in the Design Studio</Row>
                <Row label="Design">{order.cardDesign.title}</Row>
                <div className="grid grid-cols-2 gap-3">
                  {([["Front", order.cardDesign.thumbnailFront], ["Back", order.cardDesign.thumbnailBack]] as const).map(
                    ([face, thumb]) => (
                      <figure key={face} className="overflow-hidden rounded-lg border border-kc-border bg-white">
                        <figcaption className="border-b border-kc-border bg-kc-bg px-2 py-1 text-[11.77px] font-semibold text-kc-muted">
                          {face}
                        </figcaption>
                        {thumb ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={thumb} alt={`${face} of ${order.cardDesign!.title}`} className="block w-full" />
                        ) : (
                          <div className="px-2 py-6 text-center text-[11.77px] text-kc-muted">No preview stored</div>
                        )}
                      </figure>
                    ),
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/api/admin/orders/${order.id}/print-file`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-kc-magenta-deep px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                  >
                    <FileIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                    Download print PDF
                  </a>
                  <a
                    href={`/api/admin/orders/${order.id}/print-file?side=front`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-kc-border bg-kc-bg px-3 py-2 text-xs font-semibold text-kc-teal hover:underline"
                  >
                    Front PNG
                  </a>
                  <a
                    href={`/api/admin/orders/${order.id}/print-file?side=back`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-kc-border bg-kc-bg px-3 py-2 text-xs font-semibold text-kc-teal hover:underline"
                  >
                    Back PNG
                  </a>
                  <a
                    href={`/services/business-cards/design/${order.cardDesign.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-kc-border bg-kc-bg px-3 py-2 text-xs font-semibold text-kc-muted hover:underline"
                  >
                    Open in editor
                  </a>
                </div>
              </div>
            ) : order.artworkPath === "UPLOAD" ? (
              <div className="space-y-2 text-sm">
                <Row label="Source">Customer supplied a print-ready file</Row>
                {order.artworkFileUrl && (
                  <a
                    href={order.artworkFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-kc-border bg-kc-bg px-3 py-2 text-xs font-semibold text-kc-teal hover:underline"
                  >
                    <FileIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                    {order.artworkFileName ?? "Download artwork"}
                  </a>
                )}
                {order.artworkWidthIn && order.artworkHeightIn && (
                  <Row label="File size">
                    {order.artworkWidthIn} × {order.artworkHeightIn} in
                    {order.artworkDpi ? ` at ${order.artworkDpi} DPI` : ""}
                  </Row>
                )}
                {order.artworkFitApplied && (
                  <p className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                    The file did not match the document size and was scaled to fit. Check the placement before printing.
                  </p>
                )}
                <Row label="Front proof approved">
                  {order.proofApprovedAt ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {new Date(order.proofApprovedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  ) : (
                    <span className="font-semibold text-red-700">Not approved — do not print</span>
                  )}
                </Row>
                {order.artworkPlacement != null && (
                  <details className="text-xs text-kc-muted">
                    <summary className="cursor-pointer font-semibold text-kc-dark">Front placement</summary>
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-kc-bg p-3">
                      {JSON.stringify(order.artworkPlacement, null, 2)}
                    </pre>
                  </details>
                )}

                {/* Double-sided orders carry a second file. Printing the front without checking for
                    a back is how a two-sided job goes out blank on one side. */}
                {order.backArtworkFileUrl && (
                  <div className="mt-4 space-y-2 border-t border-kc-border pt-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-kc-muted">Back</p>
                    <a
                      href={order.backArtworkFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-kc-border bg-kc-bg px-3 py-2 text-xs font-semibold text-kc-teal hover:underline"
                    >
                      <FileIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                      {order.backArtworkFileName ?? "Download back artwork"}
                    </a>
                    {order.backArtworkWidthIn && order.backArtworkHeightIn && (
                      <Row label="File size">
                        {order.backArtworkWidthIn} × {order.backArtworkHeightIn} in
                        {order.backArtworkDpi ? ` at ${order.backArtworkDpi} DPI` : ""}
                      </Row>
                    )}
                    <Row label="Back proof approved">
                      {order.backProofApprovedAt ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                          {new Date(order.backProofApprovedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                      ) : (
                        <span className="font-semibold text-red-700">Not approved — do not print</span>
                      )}
                    </Row>
                    {order.backArtworkPlacement != null && (
                      <details className="text-xs text-kc-muted">
                        <summary className="cursor-pointer font-semibold text-kc-dark">Back placement</summary>
                        <pre className="mt-2 overflow-x-auto rounded-lg bg-kc-bg p-3">
                          {JSON.stringify(order.backArtworkPlacement, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-sm text-kc-dark">
                <PenLine className="h-4 w-4 text-kc-muted" strokeWidth={1.75} />
                We design this one. See the brief below.
              </p>
            )}
            {order.termsVersion && (
              <p className="mt-3 text-xs text-kc-muted">
                Accepted Terms of Sale v{order.termsVersion}
                {order.termsAcceptedAt ? ` on ${new Date(order.termsAcceptedAt).toLocaleDateString()}` : ""}
              </p>
            )}
          </Panel>

          {order.items.map((item) => {
            const config = (item.config ?? {}) as ItemConfig;
            const hasBrief = Boolean(
              config.businessName || config.phone || config.email || config.website ||
              config.linkedin || config.brandColorsNotes || config.notes || config.brandFiles?.length
            );
            if (!hasBrief) return null;
            return (
              <Panel key={item.id} title={`Design brief${order.items.length > 1 ? ` — ${item.product.name}` : ""}`}>
                <div className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
                  {config.businessName && <Row label="Business">{config.businessName}</Row>}
                  {config.phone && <Row label="Phone">{config.phone}</Row>}
                  {config.email && <Row label="Email">{config.email}</Row>}
                  {config.website && <Row label="Website">{config.website}</Row>}
                  {config.linkedin && <Row label="LinkedIn">{config.linkedin}</Row>}
                  {config.brandColorsNotes && <Row label="Brand colours">{config.brandColorsNotes}</Row>}
                </div>
                {config.notes && (
                  <div className="mt-3 text-sm">
                    <span className="text-xs uppercase tracking-wide text-kc-muted">Notes</span>
                    <p className="mt-1 whitespace-pre-wrap text-kc-dark">{config.notes}</p>
                  </div>
                )}
                {config.brandFiles && config.brandFiles.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {config.brandFiles.map((f) => (
                      <li key={f.url}>
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-fit items-center gap-1.5 rounded-lg border border-kc-border bg-kc-bg px-3 py-2 text-xs text-kc-teal hover:underline"
                        >
                          <FileIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                          {f.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            );
          })}

          {order.internalNotes && (
            <Panel title="Internal note">
              <p className="whitespace-pre-wrap text-sm text-kc-dark">{order.internalNotes}</p>
            </Panel>
          )}

          <Panel title="History">
            {order.events.length === 0 ? (
              <p className="text-sm text-kc-muted">
                Nothing recorded. Orders placed before history was added have no timeline.
              </p>
            ) : (
              <ol className="space-y-3">
                {order.events.map((e) => (
                  <li key={e.id} className="border-l-2 border-kc-border pl-3">
                    <p className="text-sm leading-snug text-kc-dark">{e.message}</p>
                    <p className="text-xs text-kc-muted">
                      {new Date(e.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      {e.actorName ? ` · ${e.actorName}` : " · system"}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div>
          <AdminOrderActions
            orderId={order.id}
            currentStatus={order.status}
            trackingCarrier={order.trackingCarrier}
            trackingNumber={order.trackingNumber}
            notes={order.notes}
            internalNotes={order.internalNotes}
          />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-kc-border">
      <CardContent className="space-y-2 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-kc-muted">{title}</h3>
        {children}
      </CardContent>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="text-sm">
      <span className="text-kc-muted">{label}: </span>
      <span className="text-kc-dark">{children}</span>
    </p>
  );
}
