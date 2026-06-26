import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const STATUS_PROGRESS: Record<string, number> = {
  PENDING: 10,
  IN_PROGRESS: 40,
  REVIEW: 65,
  REVISION: 50,
  COMPLETE: 100,
};

export default async function ProjectsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/sign-in");

  const projects = await db.project.findMany({
    where: { userId: user.id },
    include: { order: { include: { items: { include: { product: true } } } }, revisionRequests: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-kc-dark">My Projects</h1>
      {projects.length === 0 ? (
        <p className="text-kc-muted">No projects yet. Projects are created automatically after your order is paid.</p>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const progress = STATUS_PROGRESS[project.status] ?? 0;
            const productName = project.order.items[0]?.product?.name ?? "Design Project";
            return (
              <Link key={project.id} href={`/account/projects/${project.id}`}>
                <Card className="border-kc-border hover:border-kc-teal/30 transition-colors cursor-pointer">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-kc-dark">{productName}</div>
                        <div className="text-xs text-kc-muted">
                          Started {new Date(project.createdAt).toLocaleDateString()}
                          {project.revisionRequests.length > 0 && ` - ${project.revisionRequests.length} revision(s) requested`}
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={
                          project.status === "COMPLETE" ? "bg-kc-sage/20 text-kc-teal border-0" :
                          project.status === "IN_PROGRESS" ? "bg-kc-teal/10 text-kc-teal border-0" :
                          project.status === "REVIEW" ? "bg-kc-yellow/30 text-kc-dark border-0" :
                          "bg-kc-bg text-kc-muted border-kc-border"
                        }
                      >
                        {project.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <Progress value={progress} className="h-1.5 bg-kc-border" />
                    <div className="text-xs text-kc-muted">{progress}% complete</div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
