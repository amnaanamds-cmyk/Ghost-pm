"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { writeAgentPrompt } from "@/lib/agent-prompt";
import { createIssue } from "@/lib/github";
import { actionError, type ActionResult } from "@/lib/action-result";

async function getOwnedTask(userId: string, taskId: string) {
  const task = await db.task.findFirst({
    where: { id: taskId, project: { userId } },
    include: { project: true, capture: true },
  });
  if (!task) throw new Error("Task not found");
  return task;
}

export async function generateAgentPrompt(taskId: string): Promise<ActionResult<{ agentPrompt: string }>> {
  try {
    const userId = await requireUserId();
    const task = await getOwnedTask(userId, taskId);
    const agentPrompt = await writeAgentPrompt(task);
    revalidatePath(`/projects/${task.projectId}`);
    return { ok: true, data: { agentPrompt } };
  } catch (e) {
    return actionError(e, "Failed to generate prompt");
  }
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
  patch: { status?: string; priority?: string; title?: string; why?: string }
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
      })
      .parse(patch);
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
