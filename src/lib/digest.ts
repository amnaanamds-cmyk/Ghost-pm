import "server-only";
import { db } from "@/lib/db";
import { digestEmail, sendEmail, unsubscribeUrl, type DigestTask } from "@/lib/email";
import type { RoadmapContent } from "@/lib/roadmap";

const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 } as const;

/** Sends each opted-in member a digest of every workspace they belong to. Returns counts. */
export async function sendWeeklyDigests(baseUrl: string) {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const workspaces = await db.workspace.findMany({
    where: { projects: { some: { tasks: { some: { status: { not: "done" } } } } } },
    select: {
      id: true,
      name: true,
      members: { select: { user: { select: { id: true, email: true, emailDigest: true } } } },
      projects: {
        select: {
          id: true,
          name: true,
          roadmaps: { orderBy: { createdAt: "desc" }, take: 1, select: { content: true, createdAt: true } },
          tasks: {
            where: { OR: [{ status: { not: "done" } }, { updatedAt: { gte: weekAgo } }] },
            select: { title: true, priority: true, status: true, updatedAt: true },
          },
        },
      },
    },
  });

  let sent = 0;
  let skipped = 0;
  for (const ws of workspaces) {
    const projects = ws.projects
      .map((p) => {
        const open = p.tasks.filter((t) => t.status !== "done");
        const roadmap = p.roadmaps[0];
        // Use this week's plan if it's fresh; otherwise fall back to the top open tasks by priority.
        const planned =
          roadmap && roadmap.createdAt >= weekAgo ? (roadmap.content as RoadmapContent).thisWeek : null;
        const thisWeek: DigestTask[] =
          planned ??
          [...open]
            .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
            .slice(0, 5)
            .map((t) => ({ title: t.title, priority: t.priority }));
        return {
          name: p.name,
          url: `${baseUrl}/projects/${p.id}`,
          thisWeek,
          openCount: open.length,
          doneThisWeek: p.tasks.filter((t) => t.status === "done" && t.updatedAt >= weekAgo).length,
        };
      })
      .filter((p) => p.openCount > 0);
    if (!projects.length) continue;

    for (const { user } of ws.members) {
      if (!user.email || !user.emailDigest) {
        skipped++;
        continue;
      }
      const unsubscribe = unsubscribeUrl(baseUrl, user.id);
      const email = digestEmail({ workspace: ws.name, projects, unsubscribe });
      const res = await sendEmail({
        to: user.email,
        ...email,
        headers: { "List-Unsubscribe": `<${unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      });
      if (res.sent) sent++;
      else skipped++;
    }
  }
  return { workspaces: workspaces.length, sent, skipped };
}
