"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AdminUserRoleSelect({ userId, currentRole }: { userId: string; currentRole: string }) {
  const [role, setRole] = useState(currentRole);

  const update = async (newRole: string) => {
    setRole(newRole);
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
  };

  return (
    <Select value={role} onValueChange={(v) => v && update(v)}>
      <SelectTrigger className="h-7 text-xs border-kc-border w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="USER">USER</SelectItem>
        <SelectItem value="ADMIN">ADMIN</SelectItem>
        <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
      </SelectContent>
    </Select>
  );
}
