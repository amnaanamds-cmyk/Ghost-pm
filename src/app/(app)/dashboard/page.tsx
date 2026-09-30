import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { UsageMeter } from "@/components/usage-meter";
import { Onboarding } from "@/components/onboarding";
import { getUsage } from "@/lib/limits";

export default async function DashboardPage() {
  const { workspace } = await requireWorkspace();
  const usage = await getUsage(workspace.id);
  const projects = await db.project.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { tasks: { where: { status: { not: "done" } } } } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <UsageMeter usage={usage} />
        </div>
        <ProjectFormDialog
          trigger={
            <Button>
              <Plus /> New project
            </Button>
          }
        />
      </div>

      {projects.length === 0 ? (
        <Onboarding createButton={<ProjectFormDialog trigger={<Button>Create your first project</Button>} />} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="group">
              <Card className="group-hover:border-foreground/30 h-full gap-3 transition-colors">
                <CardHeader>
                  <CardTitle className="truncate">{p.name}</CardTitle>
                  <CardDescription className="line-clamp-2 min-h-10">
                    {p.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{p._count.tasks} open tasks</Badge>
                  {p.githubRepo && <Badge variant="outline">{p.githubRepo}</Badge>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
