import { db } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminAiGenerationsPage() {
  const gens = await db.aiGeneration.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: true },
  });

  const totalCost = gens.reduce((acc, g) => acc + (g.costUsd ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-kc-dark">AI Generations</h1>
        <div className="text-sm text-kc-muted">Total cost: <span className="font-bold text-kc-dark">${totalCost.toFixed(4)}</span></div>
      </div>
      <Card className="border-kc-border">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-kc-border bg-kc-bg text-xs text-kc-muted">
                {["User", "Type", "Model", "Tokens", "Cost", "Date"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-kc-border">
              {gens.map((g) => (
                <tr key={g.id} className="hover:bg-kc-bg transition-colors">
                  <td className="px-4 py-3 text-kc-dark text-xs">{g.user?.email ?? g.userId.slice(-8)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-xs border-0 bg-kc-teal/10 text-kc-teal">{g.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-kc-muted text-xs">{g.model}</td>
                  <td className="px-4 py-3 text-kc-muted text-xs">{g.tokensUsed ?? "-"}</td>
                  <td className="px-4 py-3 text-kc-muted text-xs">${(g.costUsd ?? 0).toFixed(4)}</td>
                  <td className="px-4 py-3 text-kc-muted text-xs">{new Date(g.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {gens.length === 0 && <p className="text-center py-8 text-kc-muted text-sm">No AI generations yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
