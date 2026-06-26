import { db } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminProjectsPage() {
  const projects = await db.project.findMany({
    include: { user: true, order: { include: { items: { include: { product: true } } } }, revisionRequests: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-kc-dark">Projects</h1>
      <Card className="border-kc-border">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-kc-border bg-kc-bg text-xs text-kc-muted">
                {["Project", "Customer", "Service", "Status", "Revisions", "Started", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-kc-border">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-kc-bg transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-kc-teal">#{project.id.slice(-8)}</td>
                  <td className="px-4 py-3 text-kc-dark text-xs">{project.user?.name ?? project.user?.email ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-kc-muted text-xs">{project.order.items[0]?.product?.name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={`text-xs border-0 ${
                      project.status === "COMPLETE" ? "bg-kc-sage/20 text-kc-teal" :
                      project.status === "IN_PROGRESS" ? "bg-kc-teal/10 text-kc-teal" :
                      project.status === "REVIEW" ? "bg-kc-yellow/30 text-kc-dark" :
                      "bg-kc-bg text-kc-muted"
                    }`}>{project.status.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-3 text-kc-muted text-xs">{project.revisionRequests.length}</td>
                  <td className="px-4 py-3 text-kc-muted text-xs">{new Date(project.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/projects/${project.id}`} className="text-xs text-kc-teal hover:underline">Manage</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {projects.length === 0 && <p className="text-center py-8 text-kc-muted text-sm">No projects yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
