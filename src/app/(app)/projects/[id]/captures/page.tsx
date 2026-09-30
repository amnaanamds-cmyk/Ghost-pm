import Link from "next/link";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { getProjectForUser } from "@/lib/workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RetryOrganizeButton } from "@/components/capture/retry-organize-button";
import { PriorityBadge } from "@/components/tasks/priority-badge";

const PAGE_SIZE = 25;

export default async function CapturesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ before?: string }>;
}) {
  const [{ id }, { before }] = await Promise.all([params, searchParams]);
  const userId = await requireUserId();
  const { project } = await getProjectForUser(userId, id);

  const captures = await db.capture.findMany({
    where: { projectId: id, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      text: true,
      source: true,
      createdAt: true,
      imageUrl: true,
      tasks: { select: { id: true, title: true, priority: true, status: true } },
    },
  });
  const hasMore = captures.length > PAGE_SIZE;
  const page = captures.slice(0, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href={`/projects/${id}`} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="size-4" /> {project.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Capture history</h1>
        <p className="text-muted-foreground text-sm">Everything you dumped into this project, and the tasks each one became.</p>
      </div>

      {page.length === 0 ? (
        <Card className="text-muted-foreground p-8 text-center text-sm">No captures yet.</Card>
      ) : (
        <ul className="space-y-3">
          {page.map((c) => (
            <li key={c.id}>
              <Card className="gap-3 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline">{c.source}</Badge>
                  <span className="text-muted-foreground" suppressHydrationWarning>
                    {c.createdAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                  {c.imageUrl && (
                    <span className="text-muted-foreground inline-flex items-center gap-1">
                      <ImageIcon className="size-3" /> screenshot
                    </span>
                  )}
                  {c.tasks.length === 0 && (
                    <span className="ml-auto">
                      <RetryOrganizeButton captureId={c.id} />
                    </span>
                  )}
                </div>
                {c.text && <p className="text-sm whitespace-pre-wrap">{c.text}</p>}
                {c.imageUrl && (
                  <a href={`/api/captures/${c.id}/image`} target="_blank" rel="noreferrer" className="w-fit">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/captures/${c.id}/image`}
                      alt="Captured screenshot"
                      loading="lazy"
                      className="max-h-48 rounded-md border"
                    />
                  </a>
                )}
                {c.tasks.length > 0 && (
                  <ul className="space-y-1 border-l-2 pl-3">
                    {c.tasks.map((t) => (
                      <li key={t.id} className="flex items-center gap-2 text-sm">
                        <PriorityBadge priority={t.priority} />
                        <span className={t.status === "done" ? "text-muted-foreground line-through" : undefined}>{t.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
      {hasMore && (
        <Button variant="outline" asChild>
          <Link href={`?before=${page[page.length - 1].createdAt.toISOString()}`}>Older captures</Link>
        </Button>
      )}
    </div>
  );
}
