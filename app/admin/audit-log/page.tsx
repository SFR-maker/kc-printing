import { db } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminAuditLogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const take = 50;
  const skip = (page - 1) * take;

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take, skip, include: { user: true } }),
    db.auditLog.count(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-kc-dark">Audit Log</h1>
        <div className="text-sm text-kc-muted">{total} entries</div>
      </div>
      <Card className="border-kc-border">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-kc-border bg-kc-bg text-xs text-kc-muted">
                {["User", "Action", "Entity", "Entity ID", "Time"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-kc-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-kc-bg transition-colors">
                  <td className="px-4 py-2.5 text-kc-dark text-xs">{log.user?.email ?? log.userId?.slice(-8) ?? "system"}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="secondary" className="text-xs border-0 bg-kc-teal/10 text-kc-teal">{log.action}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-kc-muted text-xs">{log.entity}</td>
                  <td className="px-4 py-2.5 font-mono text-kc-muted text-xs">{log.entityId?.slice(-8) ?? "-"}</td>
                  <td className="px-4 py-2.5 text-kc-muted text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && <p className="text-center py-8 text-kc-muted text-sm">No audit entries yet.</p>}
        </CardContent>
      </Card>
      {total > take && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.ceil(total / take) }).map((_, i) => (
            <a
              key={i}
              href={`/admin/audit-log?page=${i + 1}`}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${page === i + 1 ? "bg-kc-teal text-white border-kc-teal" : "border-kc-border text-kc-muted hover:border-kc-teal/40"}`}
            >
              {i + 1}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
