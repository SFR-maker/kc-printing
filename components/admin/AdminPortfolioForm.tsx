"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function AdminPortfolioForm() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/admin/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, category, imageUrl }),
    });
    setSaving(false);
    setTitle("");
    setCategory("");
    setImageUrl("");
    router.refresh();
  };

  return (
    <Card className="border-kc-border">
      <CardContent className="p-4">
        <h3 className="font-semibold text-kc-dark mb-3 text-sm">Add Portfolio Item</h3>
        <form onSubmit={submit} className="flex gap-3 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Logo Design" className="h-8 text-sm border-kc-border w-40" required />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Logo Design" className="h-8 text-sm border-kc-border w-36" required />
          </div>
          <div className="space-y-1 flex-1 min-w-48">
            <Label className="text-xs">Image URL</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="h-8 text-sm border-kc-border" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={saving} size="sm" className="bg-kc-teal hover:bg-kc-teal/90 text-white">
              {saving ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
