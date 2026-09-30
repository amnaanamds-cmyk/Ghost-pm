"use client";

import { useTransition } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { pushTaskToGitHub } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/github-icon";

export function GitHubButton({ taskId, issueUrl }: { taskId: string; issueUrl: string | null }) {
  const [pending, startTransition] = useTransition();

  if (issueUrl) {
    return (
      <Button variant="outline" size="sm" asChild>
        <a href={issueUrl} target="_blank" rel="noreferrer">
          <ExternalLink /> View issue
        </a>
      </Button>
    );
  }
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await pushTaskToGitHub(taskId);
          if (!res.ok) return void toast.error(res.error);
          toast.success("GitHub issue created", {
            action: { label: "Open", onClick: () => window.open(res.data.url, "_blank") },
          });
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <GithubIcon className="size-4" />}
      {pending ? "Pushing…" : "Push to GitHub"}
    </Button>
  );
}
