"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { createProject, listMyRepos, updateProject, type ProjectInput } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  trigger: React.ReactNode;
  project?: { id: string } & Required<{ [K in keyof ProjectInput]: string | null }>;
};

export function ProjectFormDialog({ trigger, project }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [loadingRepos, startLoadingRepos] = useTransition();
  const [repos, setRepos] = useState<{ fullName: string; private: boolean }[] | null>(null);
  const router = useRouter();

  function loadRepos() {
    startLoadingRepos(async () => {
      const res = await listMyRepos();
      if (!res.ok) return void toast.error(res.error);
      setRepos(res.data);
      if (res.data.length === 0) toast.info("No repos with issues enabled found on your GitHub account");
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    // onSubmit (not form action) so React doesn't reset the fields when validation fails.
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const input: ProjectInput = {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      techStack: String(formData.get("techStack") ?? ""),
      githubRepo: String(formData.get("githubRepo") ?? ""),
    };
    startTransition(async () => {
      if (project) {
        const res = await updateProject(project.id, input);
        if (!res.ok) return void toast.error(res.error);
        toast.success("Project updated");
        setOpen(false);
      } else {
        const res = await createProject(input);
        if (!res.ok) return void toast.error(res.error);
        toast.success("Project created");
        setOpen(false);
        router.push(`/projects/${res.data.id}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            The description and tech stack are sent to the AI as context, so be specific.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required maxLength={100} defaultValue={project?.name ?? ""} placeholder="My SaaS" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={project?.description ?? ""}
              placeholder="What it does, who it's for, what state it's in."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="techStack">Tech stack</Label>
            <Input
              id="techStack"
              name="techStack"
              defaultValue={project?.techStack ?? ""}
              placeholder="Next.js 15, Supabase, Tailwind, Stripe"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="githubRepo">GitHub repo (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="githubRepo"
                name="githubRepo"
                list="repo-options"
                autoComplete="off"
                defaultValue={project?.githubRepo ?? ""}
                placeholder="owner/repo"
              />
              <Button type="button" variant="outline" onClick={loadRepos} disabled={loadingRepos} title="Load my GitHub repos">
                {loadingRepos ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                <span className="hidden sm:inline">{repos ? "Reload" : "My repos"}</span>
              </Button>
            </div>
            <datalist id="repo-options">
              {repos?.map((r) => (
                <option key={r.fullName} value={r.fullName}>
                  {r.private ? "private" : "public"}
                </option>
              ))}
            </datalist>
            {repos && repos.length > 0 && (
              <p className="text-muted-foreground text-xs">{repos.length} repos loaded — start typing to pick one.</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {project ? "Save" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
