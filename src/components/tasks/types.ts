import type { Priority, TaskStatus } from "@prisma/client";

export type TaskView = {
  id: string;
  title: string;
  why: string;
  priority: Priority;
  status: TaskStatus;
  agentPrompt: string | null;
  githubIssueUrl: string | null;
  assignee: Person | null;
};

export type Person = { id: string; name: string | null; image: string | null; githubLogin?: string | null };

export const STATUSES: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "Doing" },
  { id: "done", label: "Done" },
];

export const PRIORITIES: Priority[] = ["P0", "P1", "P2", "P3"];
