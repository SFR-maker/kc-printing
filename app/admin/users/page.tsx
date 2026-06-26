import { db } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminUserRoleSelect } from "@/components/admin/AdminUserRoleSelect";

export default async function AdminUsersPage() {
  const users = await db.user.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-kc-dark">Users</h1>
      <Card className="border-kc-border">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-kc-border bg-kc-bg text-xs text-kc-muted">
                {["Name", "Email", "Role", "Joined", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-kc-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-kc-bg transition-colors">
                  <td className="px-4 py-3 font-medium text-kc-dark">{user.name ?? "-"}</td>
                  <td className="px-4 py-3 text-kc-muted">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="secondary"
                      className={
                        user.role === "SUPER_ADMIN" ? "bg-kc-coral/20 text-kc-coral border-0 text-xs" :
                        user.role === "ADMIN" ? "bg-kc-teal/10 text-kc-teal border-0 text-xs" :
                        "bg-kc-bg text-kc-muted border-kc-border text-xs"
                      }
                    >
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-kc-muted text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <AdminUserRoleSelect userId={user.id} currentRole={user.role} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
