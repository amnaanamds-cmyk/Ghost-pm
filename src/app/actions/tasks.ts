"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { getProjectForUser, hasRole, memberOfProject } from "@/lib/workspace";
import { writeAgentPrompt } from "@/lib/agent-prompt";
import { createIssue, getIssueState } from "@/lib/github";
import { actionError, type ActionResult } from "@/lib/action-result";

async function getOwnedTask(userId: string, taskId: string) {
  const task = await db.task.findFirst({
    where: { id: taskId, ...memberOfProject(userId) },
    include: { project: true, capture: true },
  });
  if (!task) throw new Error("Task not found");
  return task;
}

/** Creates a GitHub issue for the task (generating the agent prompt first if needed). */
export async function pushTaskToGitHub(taskId: string): Promise<ActionResult<{ url: string }>> {
  try {
    const userId = await requireUserId();
    const task = await getOwnedTask(userId, taskId);
    if (task.githubIssueUrl) return { ok: true, data: { url: task.githubIssueUrl } };
    if (!task.project.githubRepo) return { ok: false, error: "Add a GitHub repo to this project first." };

    const agentPrompt = task.agentPrompt ?? (await writeAgentPrompt(task));
    const body = [
      `**Priority:** ${task.priority}`,
      "",
      "## Why",
      task.why || "_No rationale recorded._",
      "",
      "## Agent prompt",
      "Paste this into Claude Code / Cursor:",
      "",
      "````markdown",
      agentPrompt,
      "````",
      "",
      "---",
      "_Created by [Ghost PM](https://github.com/amnaanamds-cmyk/Ghost-pm)_",
    ].join("\n");

    const url = await createIssue(userId, task.project.githubRepo, { title: task.title, body });
    await db.task.update({ where: { id: task.id }, data: { githubIssueUrl: url } });
    revalidatePath(`/projects/${task.projectId}`);
    return { ok: true, data: { url } };
  } catch (e) {
    return actionError(e, "Failed to create GitHub issue");
  }
}

const statusSchema = z.enum(["todo", "doing", "done"]);
const prioritySchema = z.enum(["P0", "P1", "P2", "P3"]);

export async function updateTask(
  taskId: string,
  patch: { status?: string; priority?: string; title?: string; why?: string; assigneeId?: string | null }
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const task = await getOwnedTask(userId, taskId);
    const data = z
      .object({
        status: statusSchema.optional(),
        priority: prioritySchema.optional(),
        title: z.string().trim().min(1).max(200).optional(),
        why: z.string().trim().max(2000).optional(),
        assigneeId: z.string().nullable().optional(),
      })
      .parse(patch);
    if (data.assigneeId) {
      const isMember = await db.membership.findUnique({
        where: { workspaceId_userId: { workspaceId: task.project.workspaceId, userId: data.assigneeId } },
      });
      if (!isMember) return { ok: false, error: "Assignee must be a member of this workspace" };
    }
    await db.task.update({ where: { id: task.id }, data });
    revalidatePath(`/projects/${task.projectId}`);
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const task = await getOwnedTask(userId, taskId);
    await db.task.delete({ where: { id: task.id } });
    revalidatePath(`/projects/${task.projectId}`);
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

// ---------- Manual tasks ----------

const newTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  why: z.string().trim().max(2000).default(""),
  priority: prioritySchema.default("P2"),
  status: statusSchema.default("todo"),
});

/** Manually created tasks don't count toward the AI task limit. */
export async function createTask(projectId: string, input: z.input<typeof newTaskSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    await getProjectForUser(userId, projectId);
    const data = newTaskSchema.parse(input);
    const task = await db.task.create({ data: { ...data, projectId } });
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, data: { id: task.id } };
  } catch (e) {
    return actionError(e);
  }
}

// ---------- Comments ----------

export type CommentView = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null } | null;
  canDelete: boolean;
};

export async function listComments(taskId: string): Promise<ActionResult<CommentView[]>> {
  try {
    const userId = await requireUserId();
    const task = await getOwnedTask(userId, taskId);
    const isAdmin = await isWorkspaceAdmin(userId, task.project.workspaceId);
    const comments = await db.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, name: true, image: true } } },
    });
    return {
      ok: true,
      data: comments.map((c) => ({
        id: c.id,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
        author: c.author,
        canDelete: c.authorId === userId || isAdmin,
      })),
    };
  } catch (e) {
    return actionError(e);
  }
}

export async function addComment(taskId: string, body: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await getOwnedTask(userId, taskId);
    const text = z.string().trim().min(1, "Comment is empty").max(5000).parse(body);
    await db.taskComment.create({ data: { taskId, authorId: userId, body: text } });
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const comment = await db.taskComment.findFirst({
      where: { id: commentId, task: memberOfProject(userId) },
      include: { task: { select: { project: { select: { workspaceId: true } } } } },
    });
    if (!comment) return { ok: false, error: "Comment not found" };
    if (comment.authorId !== userId && !(await isWorkspaceAdmin(userId, comment.task.project.workspaceId))) {
      return { ok: false, error: "You can only delete your own comments." };
    }
    await db.taskComment.delete({ where: { id: commentId } });
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

async function isWorkspaceAdmin(userId: string, workspaceId: string) {
  const m = await db.membership.findUnique({ where: { workspaceId_userId: { workspaceId, userId } } });
  return !!m && hasRole(m.role, "ADMIN");
}

// ---------- GitHub issue sync ----------

/** Marks tasks done when their linked GitHub issue has been closed. */
export async function syncGitHubIssues(projectId: string): Promise<ActionResult<{ checked: number; closed: number }>> {
  try {
    const userId = await requireUserId();
    await getProjectForUser(userId, projectId);
    const tasks = await db.task.findMany({
      where: { projectId, githubIssueUrl: { not: null }, status: { not: "done" } },
      select: { id: true, githubIssueUrl: true },
      take: 50,
    });
    let closed = 0;
    for (const t of tasks) {
      const state = await getIssueState(userId, t.githubIssueUrl!);
      if (state === "closed") {
        await db.task.update({ where: { id: t.id }, data: { status: "done" } });
        closed++;
      }
    }
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, data: { checked: tasks.length, closed } };
  } catch (e) {
    return actionError(e, "GitHub sync failed");
  }
}
