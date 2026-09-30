import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { requireUserId } from "@/lib/session";
import { getProjectForUser } from "@/lib/workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import { CaptureBox } from "@/components/capture/capture-box";
import { db } from "@/lib/db";
import { RetryOrganizeButton } from "@/components/capture/retry-organize-button";
import { TaskBoard } from "@/components/tasks/task-board";
import { RoadmapPanel } from "@/components/roadmap/roadmap-panel";
import type { RoadmapContent } from "@/lib/roadmap";
import { getUsage } from "@/lib/limits";
import { UsageMeter } from "@/components/usage-meter";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();
  const { project, workspace } = await getProjectForUser(userId, id);
  const members = await db.membership.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
    select: { user: { select: { id: true, name: true, image: true, githubLogin: true } } },
  });
  const captures = await db.capture.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, text: true, source: true, createdAt: true, imageUrl: true, _count: { select: { tasks: true } } },
  });
  const tasks = await db.task.findMany({
    where: { projectId: id },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      why: true,
      priority: true,
      status: true,
      agentPrompt: true,
      githubIssueUrl: true,
      assignee: { select: { id: true, name: true, image: true } },
    },
  });
  const usage = await getUsage(workspace.id);
  const roadmap = await db.roadmap.findFirst({ where: { projectId: id }, orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="size-4" /> Projects
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground max-w-2xl text-sm whitespace-pre-wrap">{project.description}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {project.techStack && <Badge variant="secondary">{project.techStack}</Badge>}
              {project.githubRepo && (
                <Badge variant="outline" asChild>
                  <a href={`https://github.com/${project.githubRepo}`} target="_blank" rel="noreferrer">
                    {project.githubRepo}
                  </a>
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <ProjectFormDialog
              project={project}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil /> Edit
                </Button>
              }
            />
            <DeleteProjectButton id={project.id} name={project.name} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <CaptureBox projectId={project.id} />
        <UsageMeter usage={usage} className="justify-end" />
      </div>

      <RoadmapPanel
        projectId={project.id}
        openTaskCount={tasks.filter((t) => t.status !== "done").length}
        roadmap={
          roadmap && {
            weekStart: roadmap.weekStart.toISOString(),
            createdAt: roadmap.createdAt.toISOString(),
            content: roadmap.content as RoadmapContent,
          }
        }
      />

      <TaskBoard
        projectId={project.id}
        tasks={tasks}
        githubRepo={project.githubRepo}
        members={members.map((m) => m.user)}
        currentUserId={userId}
      />

      {captures.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-muted-foreground text-sm font-medium">Recent captures</h2>
            <Link href={`/projects/${project.id}/captures`} className="text-muted-foreground hover:text-foreground text-xs">
              View all →
            </Link>
          </div>
          <ul className="space-y-2">
            {captures.map((c) => (
              <li key={c.id} className="flex items-start gap-3 rounded-md border p-3 text-sm">
                <Badge variant="outline">{c.source}</Badge>
                <span className="line-clamp-2 flex-1">{c.text || (c.imageUrl ? "Screenshot" : "")}</span>
                {c._count.tasks === 0 && <RetryOrganizeButton captureId={c.id} />}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
