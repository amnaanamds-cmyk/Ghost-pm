import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateJson } from "@/lib/ai";
import { ROADMAP_SYSTEM, projectContext } from "@/lib/prompts";

export type RoadmapItem = { taskId: string; title: string; priority: string; reason: string };
export type RoadmapContent = {
  summary: string;
  thisWeek: RoadmapItem[];
  later: RoadmapItem[];
  ignore: RoadmapItem[];
};

/** Monday 00:00 UTC of the current week. */
export function currentWeekStart(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}

export async function planWeek(projectId: string) {
  const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });
  const tasks = await db.task.findMany({
    where: { projectId, status: { not: "done" } },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    take: 150,
  });
  if (tasks.length === 0) throw new Error("No open tasks to plan — capture some ideas first.");

  const byRef = new Map(tasks.map((t, i) => [`T${i + 1}`, t]));
  const entry = z.object({
    ref: z.string().refine((r) => byRef.has(r), "Unknown task ref — use only refs from the list"),
    reason: z.string().trim().max(400).default(""),
  });
  const schema = z.object({
    summary: z.string().trim().max(500).default(""),
    thisWeek: z.array(entry).max(5, "thisWeek must have at most 5 tasks"),
    later: z.array(entry).default([]),
    ignore: z.array(entry).default([]),
  });

  const list = [...byRef.entries()]
    .map(([ref, t]) => `${ref} [${t.priority}, ${t.status}] ${t.title}${t.why ? ` — ${t.why}` : ""}`)
    .join("\n");

  const plan = await generateJson({
    system: ROADMAP_SYSTEM,
    content: [
      {
        type: "text",
        text: `<project>\n${projectContext(project)}\n</project>\n\n<open_tasks>\n${list}\n</open_tasks>`,
      },
    ],
    schema,
  });

  // Each task lands in one bucket; anything Claude skipped defaults to "later".
  const seen = new Set<string>();
  const toItems = (entries: z.infer<typeof entry>[]) =>
    entries.flatMap(({ ref, reason }) => {
      if (seen.has(ref)) return [];
      seen.add(ref);
      const t = byRef.get(ref)!;
      return [{ taskId: t.id, title: t.title, priority: t.priority, reason }];
    });
  const content: RoadmapContent = {
    summary: plan.summary,
    thisWeek: toItems(plan.thisWeek),
    later: toItems(plan.later),
    ignore: toItems(plan.ignore),
  };
  for (const [ref, t] of byRef) {
    if (!seen.has(ref)) content.later.push({ taskId: t.id, title: t.title, priority: t.priority, reason: "Not ranked this week." });
  }

  return db.roadmap.create({ data: { projectId, weekStart: currentWeekStart(), content } });
}
