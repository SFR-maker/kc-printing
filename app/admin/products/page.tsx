import { db } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminProductsPage() {
  const products = await db.product.findMany({
    include: { packages: true, options: true, addOns: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-kc-dark">Products</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products.map((product) => (
          <Card key={product.id} className="border-kc-border">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-kc-dark">{product.name}</div>
                <Badge variant="secondary" className={`text-xs border-0 ${product.active ? "bg-kc-sage/20 text-kc-teal" : "bg-kc-bg text-kc-muted"}`}>
                  {product.active ? "Active" : "Hidden"}
                </Badge>
              </div>
              <div className="font-mono text-xs text-kc-muted">{product.slug}</div>
              <div className="flex gap-4 text-xs text-kc-muted">
                <span>{product.packages.length} packages</span>
                <span>{product.options.length} options</span>
                <span>{product.addOns.length} add-ons</span>
              </div>
              <Link href={`/admin/products/${product.id}`} className="text-xs text-kc-teal hover:underline">
                Edit product
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
