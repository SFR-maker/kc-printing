import { db } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { AdminPortfolioForm } from "@/components/admin/AdminPortfolioForm";

export default async function AdminPortfolioPage() {
  const items = await db.portfolioItem.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-kc-dark">Portfolio</h1>
      <AdminPortfolioForm />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <Card key={item.id} className="border-kc-border overflow-hidden">
            {item.imageUrl && (
              <div className="aspect-video relative">
                <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
              </div>
            )}
            <CardContent className="p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-kc-dark text-sm truncate">{item.title}</div>
                {item.featured && <Badge className="bg-kc-yellow/30 text-kc-dark border-0 text-xs shrink-0">Featured</Badge>}
              </div>
              <div className="text-xs text-kc-muted">{item.category}</div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <p className="text-kc-muted text-sm col-span-3">No portfolio items yet.</p>}
      </div>
    </div>
  );
}
