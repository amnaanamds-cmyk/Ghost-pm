"use client";

import { useId, useOptimistic, useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { Priority, TaskStatus } from "@prisma/client";
import { ExternalLink, Inbox, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { updateTask } from "@/app/actions/tasks";
import { cn } from "@/lib/utils";
import { PriorityBadge } from "./priority-badge";
import { TaskDialog } from "./task-dialog";
import { GitHubButton } from "./github-button";
import { PRIORITIES, STATUSES, type Person, type TaskView } from "./types";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NewTaskDialog } from "./new-task-dialog";
import { BoardActions } from "./board-actions";
import { Avatar } from "@/components/avatar";

export function TaskBoard({
  projectId,
  tasks,
  githubRepo,
  members,
  currentUserId,
}: {
  projectId: string;
  tasks: TaskView[];
  githubRepo: string | null;
  members: Person[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [mine, setMine] = useState(false);
  const dndId = useId(); // stable id so dnd-kit aria attributes match between SSR and client
  const [filter, setFilter] = useState<Set<Priority>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [optimisticTasks, moveTask] = useOptimistic(tasks, (state, move: { id: string; status: TaskStatus }) =>
    state.map((t) => (t.id === move.id ? { ...t, status: move.status } : t))
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  function onDragEnd(e: DragEndEvent) {
    const status = e.over?.id as TaskStatus | undefined;
    const task = optimisticTasks.find((t) => t.id === e.active.id);
    if (!status || !task || task.status === status) return;
    startTransition(async () => {
      moveTask({ id: task.id, status });
      const res = await updateTask(task.id, { status });
      if (!res.ok) toast.error(res.error);
    });
  }

  const q = query.trim().toLowerCase();
  const visible = optimisticTasks.filter(
    (t) =>
      (filter.size === 0 || filter.has(t.priority)) &&
      (!mine || t.assignee?.id === currentUserId) &&
      (!q || t.title.toLowerCase().includes(q) || t.why.toLowerCase().includes(q))
  );
  const openTask = tasks.find((t) => t.id === openId);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Board</h2>
          <NewTaskDialog projectId={projectId} />
        </div>
        <BoardActions projectId={projectId} hasRepo={!!githubRepo} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1 sm:max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks"
            aria-label="Search tasks"
            className="h-8 pl-8"
          />
        </div>
        <button
          aria-pressed={mine}
          onClick={() => setMine((m) => !m)}
          className={cn(
            "h-8 rounded-md border px-3 text-xs font-medium",
            mine ? "bg-primary text-primary-foreground" : "hover:bg-accent"
          )}
        >
          Assigned to me
        </button>
        <div className="flex items-center gap-1 sm:ml-auto" role="group" aria-label="Filter by priority">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              aria-pressed={filter.has(p)}
              onClick={() =>
                setFilter((f) => {
                  const next = new Set(f);
                  if (next.has(p)) next.delete(p);
                  else next.add(p);
                  return next;
                })
              }
              className={cn(
                "rounded-md border transition-opacity",
                filter.size > 0 && !filter.has(p) && "opacity-40",
                filter.has(p) && "ring-ring/60 ring-2"
              )}
            >
              <PriorityBadge priority={p} className="border-0" />
            </button>
          ))}
          {filter.size > 0 && (
            <button className="text-muted-foreground hover:text-foreground ml-1 text-xs" onClick={() => setFilter(new Set())}>
              Clear
            </button>
          )}
        </div>
      </div>

      <DndContext id={dndId} sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid gap-4 md:grid-cols-3">
          {STATUSES.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              label={col.label}
              tasks={visible.filter((t) => t.status === col.id)}
              onOpen={setOpenId}
            />
          ))}
        </div>
      </DndContext>

      {openTask && (
        <TaskDialog
          key={openTask.id}
          task={openTask}
          open
          members={members}
          onOpenChange={(o) => !o && setOpenId(null)}
          extraActions={
            githubRepo ? <GitHubButton taskId={openTask.id} issueUrl={openTask.githubIssueUrl} /> : undefined
          }
        />
      )}
    </section>
  );
}

function Column({
  id,
  label,
  tasks,
  onOpen,
}: {
  id: TaskStatus;
  label: string;
  tasks: TaskView[];
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      data-column={id}
      className={cn(
        "bg-muted/40 flex min-h-40 flex-col gap-2 rounded-lg border p-2 transition-colors",
        isOver && "border-ring bg-accent/60"
      )}
    >
      <div className="flex items-center justify-between px-1 pt-1">
        <h3 className="text-sm font-medium">{label}</h3>
        <span className="text-muted-foreground text-xs">{tasks.length}</span>
      </div>
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} onOpen={() => onOpen(t.id)} />
      ))}
      {tasks.length === 0 && (
        <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-1 py-6 text-xs">
          <Inbox className="size-4" />
          {id === "todo" ? "Capture something to create tasks" : "Drag tasks here"}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, onOpen }: { task: TaskView; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.key === "Enter") onOpen();
      }}
      data-task={task.title}
      className={cn(
        "bg-card cursor-grab touch-manipulation rounded-md border p-3 text-left shadow-xs select-none active:cursor-grabbing",
        isDragging && "relative z-50 rotate-1 shadow-lg",
        task.status === "done" && "opacity-70"
      )}
    >
      <div className="flex items-start gap-2">
        <PriorityBadge priority={task.priority} className="mt-0.5" />
        <span className={cn("flex-1 text-sm leading-snug font-medium", task.status === "done" && "line-through")}>
          {task.title}
        </span>
      </div>
      {task.why && <p className="text-muted-foreground mt-1.5 line-clamp-2 text-xs">{task.why}</p>}
      {(task.agentPrompt || task.githubIssueUrl || task.assignee) && (
        <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
          {task.agentPrompt && (
            <span className="inline-flex items-center gap-1">
              <Sparkles className="size-3" /> Prompt
            </span>
          )}
          {task.githubIssueUrl && (
            <span className="inline-flex items-center gap-1">
              <ExternalLink className="size-3" /> Issue
            </span>
          )}
          {task.assignee && <Avatar person={task.assignee} className="ml-auto size-5" />}
        </div>
      )}
    </div>
  );
}
