"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

const STATUSES = ["DRAFT", "PENDING", "PAID", "IN_PROGRESS", "REVIEW", "COMPLETE", "CANCELLED"];

export function AdminOrderActions({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const save = async () => {
    setSaving(true);
    await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSaving(false);
    router.refresh();
  };

  return (
    <Card className="border-kc-border">
      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold text-kc-dark text-sm">Update Status</h3>
        <div className="flex gap-2">
          <Select value={status} onValueChange={(v) => v && setStatus(v)}>
            <SelectTrigger className="border-kc-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={save} disabled={saving || status === currentStatus} className="bg-kc-teal hover:bg-kc-teal/90 text-white">
            {saving ? "Saving..." : "Update"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
