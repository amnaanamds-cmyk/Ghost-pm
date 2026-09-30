"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Sparkles, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteTask, updateTask } from "@/app/actions/tasks";
import { useStreamedPrompt } from "@/hooks/use-streamed-prompt";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TaskComments } from "./task-comments";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PriorityBadge } from "./priority-badge";
import { PRIORITIES, STATUSES, type Person, type TaskView } from "./types";

const selectClass =
  "border-input dark:bg-input/30 h-8 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function TaskDialog({
  task,
  open,
  onOpenChange,
  extraActions,
  members,
}: {
  task: TaskView;
  members: Person[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extraActions?: React.ReactNode;
}) {
  const [saving, startSaving] = useTransition();
  const [editing, setEditing] = useState(false);
  const stream = useStreamedPrompt(task.id);
  const generating = stream.streaming;
  // Show the live/just-finished stream until the server re-render catches up.
  const agentPrompt = stream.text ?? task.agentPrompt;

  async function generate() {
    const res = await stream.start();
    if (!res.ok) {
      stream.reset();
      if (res.error !== "Cancelled") toast.error(res.error);
    } else toast.success("Agent prompt ready");
  }

  function saveEdits(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startSaving(async () => {
      const res = await updateTask(task.id, { title: String(fd.get("title") ?? ""), why: String(fd.get("why") ?? "") });
      if (!res.ok) return void toast.error(res.error);
      setEditing(false);
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
          {editing ? (
            <form onSubmit={saveEdits} className="grid gap-2 pr-6">
              <DialogTitle className="sr-only">Edit task</DialogTitle>
              <Input name="title" defaultValue={task.title} maxLength={200} required aria-label="Title" autoFocus />
              <Textarea name="why" defaultValue={task.why} maxLength={2000} rows={3} aria-label="Why" placeholder="Why does this matter?" />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                  {saving && <Loader2 className="animate-spin" />} Save
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-start gap-2 pr-6">
                <PriorityBadge priority={task.priority} className="mt-1" />
                <DialogTitle className="flex-1 leading-snug">{task.title}</DialogTitle>
                <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditing(true)} aria-label="Edit task">
                  <Pencil className="size-3.5" />
                </Button>
              </div>
              <DialogDescription className="whitespace-pre-wrap">{task.why || "No rationale recorded."}</DialogDescription>
            </>
          )}
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
          <select
            aria-label="Assignee"
            className={selectClass}
            value={task.assignee?.id ?? ""}
            disabled={saving}
            onChange={(e) => patch({ assigneeId: e.target.value || null })}
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || m.githubLogin || "Member"}
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
              {generating ? (
                <Button size="sm" variant="outline" onClick={() => stream.stop()}>
                  <Square /> Writing… stop
                </Button>
              ) : (
                <Button size="sm" variant={agentPrompt ? "outline" : "default"} onClick={generate}>
                  <Sparkles />
                  {agentPrompt ? "Regenerate" : "Generate agent prompt"}
                </Button>
              )}
            </div>
          </div>
          {generating && !stream.text ? (
            <div className="space-y-2 rounded-md border p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4" style={{ width: `${90 - i * 9}%` }} />
              ))}
            </div>
          ) : agentPrompt ? (
            <pre
              data-agent-prompt
              className="bg-muted max-h-[45vh] overflow-auto rounded-md border p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap"
            >
              {agentPrompt}
              {generating && <span className="bg-foreground ml-0.5 inline-block h-3 w-1.5 animate-pulse align-middle" />}
            </pre>
          ) : (
            <p className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
              Generate a detailed, paste-ready prompt for Claude Code or Cursor: goal, context, likely files, steps,
              acceptance criteria and guardrails.
            </p>
          )}
        </div>

        <div className="border-t pt-4">
          <TaskComments taskId={task.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
