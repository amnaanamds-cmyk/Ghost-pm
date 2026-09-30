import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateJson, imageBlock } from "@/lib/ai";
import { ORGANIZER_SYSTEM, projectContext } from "@/lib/prompts";

const organizedTasksSchema = z
  .union([
    z.array(z.unknown()),
    z.object({ tasks: z.array(z.unknown()) }).transform((o) => o.tasks), // tolerate a wrapper object
  ])
  .pipe(
    z
      .array(
        z.object({
          title: z.string().trim().min(1).max(200),
          why: z.string().trim().max(2000).default(""),
          priority: z.enum(["P0", "P1", "P2", "P3"]),
        })
      )
      .max(20)
  );

/** Runs the AI organizer on a capture and stores the resulting tasks. Caller must check ownership. */
export async function organizeCapture(captureId: string) {
  const capture = await db.capture.findUniqueOrThrow({
    where: { id: captureId },
    include: { project: true },
  });
  const openTasks = await db.task.findMany({
    where: { projectId: capture.projectId, status: { not: "done" } },
    select: { title: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const content: Anthropic.ContentBlockParam[] = [];
  const img = capture.imageUrl ? imageBlock(capture.imageUrl) : null;
  if (img) content.push(img);
  content.push({
    type: "text",
    text: [
      "<project>",
      projectContext(capture.project),
      "</project>",
      "",
      "<existing_open_tasks>",
      openTasks.length ? openTasks.map((t) => `- ${t.title}`).join("\n") : "(none)",
      "</existing_open_tasks>",
      "",
      `<raw_input source="${capture.source}">`,
      capture.text || (img ? "(screenshot only — see attached image)" : ""),
      "</raw_input>",
    ].join("\n"),
  });

  const tasks = await generateJson({ system: ORGANIZER_SYSTEM, content, schema: organizedTasksSchema });

  await db.task.createMany({
    data: tasks.map((t) => ({ ...t, projectId: capture.projectId, captureId: capture.id })),
  });
  return tasks.length;
}
