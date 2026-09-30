import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { requireUserId } from "@/lib/session";
import { getOwnedProject } from "@/lib/projects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();
  const project = await getOwnedProject(userId, id);

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
    </div>
  );
}
