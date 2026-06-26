"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AdminCouponForm() {
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [type, setType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.toUpperCase(), discount: parseFloat(discount), type }),
    });
    setSaving(false);
    setCode("");
    setDiscount("");
    router.refresh();
  };

  return (
    <Card className="border-kc-border">
      <CardContent className="p-4">
        <h3 className="font-semibold text-kc-dark mb-3 text-sm">Create Coupon</h3>
        <form onSubmit={submit} className="flex gap-3 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="SAVE20" className="w-32 h-8 text-sm border-kc-border" required />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Discount</Label>
            <Input value={discount} onChange={(e) => setDiscount(e.target.value)} type="number" placeholder="20" className="w-24 h-8 text-sm border-kc-border" required />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={(v) => v && setType(v as "PERCENT" | "FIXED")}>
              <SelectTrigger className="w-28 h-8 text-sm border-kc-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENT">Percent</SelectItem>
                <SelectItem value="FIXED">Fixed $</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={saving} size="sm" className="bg-kc-teal hover:bg-kc-teal/90 text-white">
              {saving ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
