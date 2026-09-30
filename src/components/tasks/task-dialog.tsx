"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteTask, generateAgentPrompt, updateTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PriorityBadge } from "./priority-badge";
import { PRIORITIES, STATUSES, type TaskView } from "./types";

const selectClass =
  "border-input dark:bg-input/30 h-8 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function TaskDialog({
  task,
  open,
  onOpenChange,
  extraActions,
}: {
  task: TaskView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extraActions?: React.ReactNode;
}) {
  const [generating, startGenerating] = useTransition();
  const [saving, startSaving] = useTransition();
  // Local copy so a fresh prompt shows instantly, before the server re-render lands.
  const [prompt, setPrompt] = useState<string | null>(null);
  const agentPrompt = prompt ?? task.agentPrompt;

  function generate() {
    startGenerating(async () => {
      const res = await generateAgentPrompt(task.id);
      if (!res.ok) return void toast.error(res.error);
      setPrompt(res.data.agentPrompt);
      toast.success("Agent prompt ready");
    });
  }

  function patch(p: Parameters<typeof updateTask>[1]) {
    startSaving(async () => {
      const res = await updateTask(task.id, p);
      if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 pr-6">
            <PriorityBadge priority={task.priority} />
            <DialogTitle className="leading-snug">{task.title}</DialogTitle>
          </div>
          <DialogDescription className="whitespace-pre-wrap">{task.why || "No rationale recorded."}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Status"
            className={selectClass}
            value={task.status}
            disabled={saving}
            onChange={(e) => patch({ status: e.target.value })}
          >
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Priority"
            className={selectClass}
            value={task.priority}
            disabled={saving}
            onChange={(e) => patch({ priority: e.target.value })}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {extraActions}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive ml-auto"
            disabled={saving}
            onClick={() => {
              if (!confirm("Delete this task?")) return;
              startSaving(async () => {
                const res = await deleteTask(task.id);
                if (!res.ok) return void toast.error(res.error);
                onOpenChange(false);
                toast.success("Task deleted");
              });
            }}
          >
            <Trash2 /> Delete
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Agent prompt</h3>
            <div className="flex gap-2">
              {agentPrompt && !generating && <CopyButton text={agentPrompt} />}
              <Button size="sm" variant={agentPrompt ? "outline" : "default"} onClick={generate} disabled={generating}>
                {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                {generating ? "Writing…" : agentPrompt ? "Regenerate" : "Generate agent prompt"}
              </Button>
            </div>
          </div>
          {generating ? (
            <div className="space-y-2 rounded-md border p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4" style={{ width: `${90 - i * 9}%` }} />
              ))}
            </div>
          ) : agentPrompt ? (
            <pre className="bg-muted max-h-[45vh] overflow-auto rounded-md border p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
              {agentPrompt}
            </pre>
          ) : (
            <p className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
              Generate a detailed, paste-ready prompt for Claude Code or Cursor: goal, context, likely files, steps,
              acceptance criteria and guardrails.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
