"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  id: string;
  name: string;
  description: string;
  category: string;
  active: boolean;
  sortOrder: number;
}

export function AdminProductForm(product: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [category, setCategory] = useState(product.category);
  const [active, setActive] = useState(product.active);
  const [sortOrder, setSortOrder] = useState(String(product.sortOrder));

  const dirty =
    name !== product.name || description !== product.description || category !== product.category ||
    active !== product.active || sortOrder !== String(product.sortOrder);

  async function save() {
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, category, active, sortOrder: Number(sortOrder) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setResult({ ok: false, text: body?.error ?? "That didn't save." });
        return;
      }
      setResult({ ok: true, text: "Saved. Live on the site now." });
      router.refresh();
    } catch {
      setResult({ ok: false, text: "Couldn't reach the server." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-kc-border">
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1.5">
          <Label className="text-xs text-kc-muted">Name — shown on the site and on orders</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="border-kc-border" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-kc-muted">Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="border-kc-border" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-kc-muted">Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} className="border-kc-border" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-kc-muted">Sort order — lower shows first</Label>
            <Input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="border-kc-border" />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-kc-border p-3">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="mt-0.5 accent-kc-coral" />
          <span className="text-sm">
            <span className="block font-semibold text-kc-dark">Sell this product</span>
            <span className="block text-xs leading-snug text-kc-muted">
              Unticking hides it from the shop. Existing orders keep working — nothing is deleted.
            </span>
          </span>
        </label>

        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving || !dirty} className="bg-kc-teal text-white hover:bg-kc-teal/90">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save product"}
          </Button>
          {result && (
            <span className={result.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{result.text}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
