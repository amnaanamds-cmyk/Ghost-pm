import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { tasksToCsv, tasksToMarkdown } from "@/lib/export";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!(await hit("export", session.user.id))) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { id } = await params;
  const project = await db.project.findFirst({
    where: { id, workspace: { members: { some: { userId: session.user.id } } } },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db.task.findMany({
    where: { projectId: id },
    orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "asc" }],
    include: { assignee: { select: { name: true, githubLogin: true } } },
  });
  const tasks = rows.map((t) => ({ ...t, assignee: t.assignee?.githubLogin ?? t.assignee?.name ?? null }));

  const format = new URL(req.url).searchParams.get("format") === "md" ? "md" : "csv";
  const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
  const body = format === "md" ? tasksToMarkdown(project.name, tasks) : tasksToCsv(tasks);
  return new Response(body, {
    headers: {
      "Content-Type": format === "md" ? "text/markdown; charset=utf-8" : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-tasks.${format}"`,
      "Cache-Control": "no-store",
    },
  });
}
