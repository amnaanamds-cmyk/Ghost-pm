import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { Capture, Project, Task } from "@prisma/client";
import { db } from "@/lib/db";
import { generateText, imageBlock } from "@/lib/ai";
import { loadImageDataUrl } from "@/lib/storage";
import { AGENT_PROMPT_SYSTEM, projectContext } from "@/lib/prompts";

type TaskWithContext = Task & { project: Project; capture: Capture | null };

/** Builds the Claude request content for an agent prompt (project, task, original note + screenshot). */
export async function agentPromptContent(task: TaskWithContext): Promise<Anthropic.ContentBlockParam[]> {
  const content: Anthropic.ContentBlockParam[] = [];
  const dataUrl = task.capture?.imageUrl ? await loadImageDataUrl(task.capture.imageUrl) : null;
  const img = dataUrl ? imageBlock(dataUrl) : null;
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
  return content;
}

/** Generates and stores a coding-agent prompt for a task (non-streaming). Caller must check access. */
export async function writeAgentPrompt(task: TaskWithContext) {
  const agentPrompt = await generateText({ system: AGENT_PROMPT_SYSTEM, content: await agentPromptContent(task) });
  await db.task.update({ where: { id: task.id }, data: { agentPrompt } });
  return agentPrompt;
}
