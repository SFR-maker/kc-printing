"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp } from "lucide-react";

interface PageSeo {
  id: string;
  path: string;
  title: string | null;
  description: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
}

export function AdminSeoEditor({ pages }: { pages: PageSeo[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, Partial<PageSeo>>>(
    Object.fromEntries(pages.map((p) => [p.id, p]))
  );
  const [saving, setSaving] = useState<string | null>(null);
  const router = useRouter();

  const update = (id: string, field: keyof PageSeo, value: string) => {
    setValues((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const save = async (id: string) => {
    setSaving(id);
    const data = values[id];
    await fetch(`/api/admin/seo/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(null);
    router.refresh();
  };

  return (
    <div className="space-y-2">
      {pages.map((page) => {
        const v = values[page.id] ?? page;
        const isOpen = expanded === page.id;
        return (
          <Card key={page.id} className="border-kc-border">
            <button
              className="w-full flex items-center justify-between p-4 text-left"
              onClick={() => setExpanded(isOpen ? null : page.id)}
            >
              <div>
                <div className="font-mono text-sm text-kc-dark">{page.path}</div>
                <div className="text-xs text-kc-muted truncate max-w-md">{v.title ?? "No title set"}</div>
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4 text-kc-muted" /> : <ChevronDown className="h-4 w-4 text-kc-muted" />}
            </button>
            {isOpen && (
              <CardContent className="p-4 pt-0 space-y-3 border-t border-kc-border">
                <div className="space-y-1">
                  <Label className="text-xs">Meta Title</Label>
                  <Input value={v.title ?? ""} onChange={(e) => update(page.id, "title", e.target.value)} className="border-kc-border text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Meta Description</Label>
                  <Textarea value={v.description ?? ""} onChange={(e) => update(page.id, "description", e.target.value)} className="border-kc-border text-sm" rows={2} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">OG Title</Label>
                  <Input value={v.ogTitle ?? ""} onChange={(e) => update(page.id, "ogTitle", e.target.value)} className="border-kc-border text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">OG Description</Label>
                  <Textarea value={v.ogDescription ?? ""} onChange={(e) => update(page.id, "ogDescription", e.target.value)} className="border-kc-border text-sm" rows={2} />
                </div>
                <Button size="sm" disabled={saving === page.id} onClick={() => save(page.id)} className="bg-kc-teal hover:bg-kc-teal/90 text-white">
                  {saving === page.id ? "Saving..." : "Save"}
                </Button>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
