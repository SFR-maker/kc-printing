"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDollars } from "@/lib/utils";

interface PackageWithProduct {
  id: string;
  name: string;
  price: number;
  product: { name: string };
}

export function AdminPricingEditor({ packages }: { packages: PackageWithProduct[] }) {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(packages.map((p) => [p.id, p.price]))
  );
  const [saving, setSaving] = useState<string | null>(null);
  const router = useRouter();

  const save = async (id: string) => {
    setSaving(id);
    await fetch(`/api/admin/pricing/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: values[id] }),
    });
    setSaving(null);
    router.refresh();
  };

  const byProduct = packages.reduce<Record<string, PackageWithProduct[]>>((acc, pkg) => {
    const key = pkg.product.name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(pkg);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(byProduct).map(([productName, pkgs]) => (
        <Card key={productName} className="border-kc-border">
          <CardContent className="p-4">
            <h3 className="font-semibold text-kc-dark mb-3">{productName}</h3>
            <div className="space-y-2">
              {pkgs.map((pkg) => (
                <div key={pkg.id} className="flex items-center gap-3">
                  <div className="w-32 text-sm text-kc-muted">{pkg.name}</div>
                  <div className="text-xs text-kc-muted w-20">{formatDollars(pkg.price)}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-kc-muted">$</span>
                    <Input
                      type="number"
                      value={values[pkg.id] ?? pkg.price}
                      onChange={(e) => setValues((p) => ({ ...p, [pkg.id]: parseFloat(e.target.value) || 0 }))}
                      className="w-24 h-7 text-sm border-kc-border"
                      step="0.01"
                    />
                    <Button
                      size="sm"
                      disabled={saving === pkg.id || values[pkg.id] === pkg.price}
                      onClick={() => save(pkg.id)}
                      className="h-7 text-xs bg-kc-teal hover:bg-kc-teal/90 text-white"
                    >
                      {saving === pkg.id ? "..." : "Save"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
