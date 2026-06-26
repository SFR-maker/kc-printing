"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function AdminTestimonialActions({ id, approved, featured }: { id: string; approved: boolean; featured: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const update = async (data: { approved?: boolean; featured?: boolean }) => {
    setLoading(true);
    await fetch(`/api/admin/testimonials/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" disabled={loading} onClick={() => update({ approved: !approved })}
        className="h-7 text-xs border-kc-border">
        {approved ? "Unapprove" : "Approve"}
      </Button>
      <Button size="sm" variant="outline" disabled={loading} onClick={() => update({ featured: !featured })}
        className="h-7 text-xs border-kc-border">
        {featured ? "Unfeature" : "Feature"}
      </Button>
    </div>
  );
}
