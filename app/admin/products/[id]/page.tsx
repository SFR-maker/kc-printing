import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { db } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { AdminProductForm } from "@/components/admin/AdminProductForm";
import { formatDollars } from "@/lib/utils";
import { SERVICES } from "@/lib/service-data";

export default async function AdminProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id },
    include: {
      packages: { orderBy: { price: "asc" } },
      addOns: { orderBy: { price: "asc" } },
      options: true,
      _count: { select: { orderItems: true } },
    },
  });

  if (!product) notFound();

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-kc-muted hover:text-kc-dark">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> All products
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-kc-dark">{product.name}</h1>
          <p className="font-mono text-xs text-kc-muted">{product.slug}</p>
        </div>
        {/* Only four services have a page. A product added to the database without one would
            otherwise get a link straight to a 404. */}
        {product.slug in SERVICES ? (
          <Link
            href={`/services/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-kc-magenta-deep hover:text-kc-dark"
          >
            See it on the site <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
          </Link>
        ) : (
          <span className="text-xs text-kc-muted">No public page for this slug</span>
        )}
      </div>

      <AdminProductForm
        id={product.id}
        name={product.name}
        description={product.description}
        category={product.category}
        active={product.active}
        sortOrder={product.sortOrder}
      />

      <Card className="border-kc-border">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-kc-dark">Packages and add-ons</h2>
            <Link href="/admin/pricing" className="text-xs text-kc-teal hover:underline">
              Change prices
            </Link>
          </div>

          {product.packages.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-kc-muted">Design packages</p>
              <ul className="divide-y divide-kc-border">
                {product.packages.map((p) => (
                  <li key={p.id} className="flex justify-between py-2 text-sm">
                    <span className="text-kc-dark">{p.name}</span>
                    <span className="font-semibold text-kc-dark">{formatDollars(p.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.addOns.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-kc-muted">Add-ons</p>
              <ul className="divide-y divide-kc-border">
                {product.addOns.map((a) => (
                  <li key={a.id} className="flex justify-between py-2 text-sm">
                    <span className="text-kc-dark">{a.name}</span>
                    <span className="font-semibold text-kc-dark">+{formatDollars(a.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.packages.length === 0 && product.addOns.length === 0 && (
            <p className="text-sm text-kc-muted">
              No packages or add-ons. This product is priced from the print cost table instead.
            </p>
          )}

          <p className="text-xs text-kc-muted">
            {product.options.length} configurable {product.options.length === 1 ? "option" : "options"} ·{" "}
            ordered {product._count.orderItems} {product._count.orderItems === 1 ? "time" : "times"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
