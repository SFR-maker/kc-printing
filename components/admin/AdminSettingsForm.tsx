"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Setting {
  id: string;
  key: string;
  value: string;
  type: string;
}

export function AdminSettingsForm({ settings }: { settings: Setting[] }) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value]))
  );
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const save = async (key: string) => {
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: values[key] }),
    });
    setSaving(false);
    router.refresh();
  };

  return (
    <Card className="border-kc-border">
      <CardContent className="p-5 space-y-4">
        {settings.map((s) => (
          <div key={s.id} className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs font-mono text-kc-muted">{s.key}</Label>
              <Input
                value={values[s.key] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [s.key]: e.target.value }))}
                className="border-kc-border text-sm"
              />
            </div>
            <Button
              size="sm"
              disabled={saving || values[s.key] === s.value}
              onClick={() => save(s.key)}
              className="bg-kc-teal hover:bg-kc-teal/90 text-white shrink-0"
            >
              Save
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
