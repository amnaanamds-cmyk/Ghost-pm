"use client";

import { useTransition } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { syncGitHubIssues } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function BoardActions({ projectId, hasRepo }: { projectId: string; hasRepo: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-1">
      {hasRepo && (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          title="Mark tasks done when their GitHub issue is closed"
          onClick={() =>
            startTransition(async () => {
              const res = await syncGitHubIssues(projectId);
              if (!res.ok) return void toast.error(res.error);
              const { checked, closed } = res.data;
              toast.success(
                checked === 0
                  ? "No open tasks are linked to GitHub issues"
                  : `Checked ${checked} issue${checked === 1 ? "" : "s"} — ${closed} closed → done`
              );
            })
          }
        >
          {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          <span className="hidden sm:inline">Sync GitHub</span>
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" aria-label="Export tasks">
            <Download /> <span className="hidden sm:inline">Export</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a href={`/api/projects/${projectId}/export?format=csv`} download>
              CSV (spreadsheet)
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`/api/projects/${projectId}/export?format=md`} download>
              Markdown
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
