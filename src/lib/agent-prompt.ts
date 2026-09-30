import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { Capture, Project, Task } from "@prisma/client";
import { db } from "@/lib/db";
import { generateText, imageBlock } from "@/lib/ai";
import { AGENT_PROMPT_SYSTEM, projectContext } from "@/lib/prompts";

/** Generates and stores a coding-agent prompt for a task. Caller must check ownership. */
export async function writeAgentPrompt(task: Task & { project: Project; capture: Capture | null }) {
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
  return agentPrompt;
}
