"use server";

import { revalidatePath } from "next/cache";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { generateText, imageBlock } from "@/lib/ai";
import { AGENT_PROMPT_SYSTEM, projectContext } from "@/lib/prompts";
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

    const content: Anthropic.ContentBlockParam[] = [];
    const img = task.capture?.imageUrl ? imageBlock(task.capture.imageUrl) : null;
    if (img) content.push(img);
    content.push({
      type: "text",
      text: [
        "<project>",
        projectContext(task.project),
        "</project>",
        "",
        "<task>",
        `Title: ${task.title}`,
        `Why: ${task.why || "(not given)"}`,
        `Priority: ${task.priority}`,
        "</task>",
        task.capture?.text ? `\n<original_note>\n${task.capture.text}\n</original_note>` : "",
        img ? "\nThe attached screenshot came with the original note." : "",
      ].join("\n"),
    });

    const agentPrompt = await generateText({ system: AGENT_PROMPT_SYSTEM, content });
    await db.task.update({ where: { id: task.id }, data: { agentPrompt } });
    revalidatePath(`/projects/${task.projectId}`);
    return { ok: true, data: { agentPrompt } };
  } catch (e) {
    return actionError(e, "Failed to generate prompt");
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
