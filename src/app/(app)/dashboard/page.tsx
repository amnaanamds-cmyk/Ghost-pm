import Link from "next/link";
import { FolderPlus, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { UsageMeter } from "@/components/usage-meter";
import { getUsage } from "@/lib/limits";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const usage = await getUsage(userId);
  const projects = await db.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { tasks: { where: { status: { not: "done" } } } } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Your projects</h1>
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
        <Card className="items-center border-dashed py-12 text-center">
          <FolderPlus className="text-muted-foreground size-10" />
          <div className="space-y-1 px-6">
            <p className="font-medium">No projects yet</p>
            <p className="text-muted-foreground text-sm">
              Create a project, describe your stack, then start dumping ideas and bugs into it.
            </p>
          </div>
          <ProjectFormDialog trigger={<Button>Create your first project</Button>} />
        </Card>
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
