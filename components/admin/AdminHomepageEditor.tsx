"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Setting { id: string; key: string; value: string; }

const LABELS: Record<string, string> = {
  hero_headline: "Hero Headline",
  hero_subheadline: "Hero Sub-headline",
  hero_cta: "Hero CTA Button Text",
  stat_clients: "Stat: Clients",
  stat_score: "Stat: Lighthouse Score",
  stat_traffic: "Stat: Traffic Increase",
  stat_rating: "Stat: Rating",
};

export function AdminHomepageEditor({ settings }: { settings: Setting[] }) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value]))
  );
  const [saving, setSaving] = useState<string | null>(null);
  const router = useRouter();

  const save = async (key: string) => {
    setSaving(key);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: values[key] }),
    });
    setSaving(null);
    router.refresh();
  };

  return (
    <Card className="border-kc-border">
      <CardContent className="p-5 space-y-5">
        {settings.map((s) => (
          <div key={s.id} className="space-y-1.5">
            <Label className="text-sm font-medium text-kc-dark">{LABELS[s.key] ?? s.key}</Label>
            {s.key.includes("headline") || s.key === "hero_subheadline" ? (
              <Textarea
                value={values[s.key] ?? ""}
                onChange={(e) => setValues((p) => ({ ...p, [s.key]: e.target.value }))}
                className="border-kc-border"
                rows={2}
              />
            ) : (
              <Input
                value={values[s.key] ?? ""}
                onChange={(e) => setValues((p) => ({ ...p, [s.key]: e.target.value }))}
                className="border-kc-border"
              />
            )}
            <Button
              size="sm"
              disabled={saving === s.key || values[s.key] === s.value}
              onClick={() => save(s.key)}
              className="bg-kc-teal hover:bg-kc-teal/90 text-white"
            >
              {saving === s.key ? "Saving..." : "Save"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
