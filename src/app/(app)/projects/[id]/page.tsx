import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { requireUserId } from "@/lib/session";
import { getOwnedProject } from "@/lib/projects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import { CaptureBox } from "@/components/capture/capture-box";
import { db } from "@/lib/db";
import { RetryOrganizeButton } from "@/components/capture/retry-organize-button";
import { TaskList } from "@/components/tasks/task-list";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();
  const project = await getOwnedProject(userId, id);
  const captures = await db.capture.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, text: true, source: true, createdAt: true, imageUrl: true, _count: { select: { tasks: true } } },
  });
  const tasks = await db.task.findMany({
    where: { projectId: id },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

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

      <CaptureBox projectId={project.id} />

      {tasks.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-muted-foreground text-sm font-medium">Tasks</h2>
          <TaskList tasks={tasks} />
        </section>
      )}

      {captures.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-muted-foreground text-sm font-medium">Recent captures</h2>
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
