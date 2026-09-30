"use client";

import { useTransition } from "react";
import { CalendarRange, Clock, Loader2, Rocket, Trash } from "lucide-react";
import { toast } from "sonner";
import type { Priority } from "@prisma/client";
import { planMyWeek } from "@/app/actions/roadmap";
import type { RoadmapContent, RoadmapItem } from "@/lib/roadmap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PriorityBadge } from "@/components/tasks/priority-badge";

export function RoadmapPanel({
  projectId,
  roadmap,
  openTaskCount,
}: {
  projectId: string;
  roadmap: { weekStart: string; createdAt: string; content: RoadmapContent } | null;
  openTaskCount: number;
}) {
  const [pending, startTransition] = useTransition();

  function plan() {
    startTransition(async () => {
      const res = await planMyWeek(projectId);
      if (!res.ok) toast.error(res.error);
      else toast.success("Your week is planned");
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">This week</h2>
          {roadmap && (
            // Local-time formatting differs between server and browser timezones.
            <p className="text-muted-foreground text-xs" suppressHydrationWarning>
              Week of {new Date(roadmap.weekStart).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })} · planned{" "}
              {new Date(roadmap.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </p>
          )}
        </div>
        <Button onClick={plan} disabled={pending || openTaskCount === 0} variant={roadmap ? "outline" : "default"}>
          {pending ? <Loader2 className="animate-spin" /> : <CalendarRange />}
          {pending ? "Planning…" : roadmap ? "Re-plan my week" : "Plan my week"}
        </Button>
      </div>

      {pending ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="gap-3 p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </Card>
          ))}
        </div>
      ) : roadmap ? (
        <>
          {roadmap.content.summary && <p className="text-sm">{roadmap.content.summary}</p>}
          <div className="grid gap-4 md:grid-cols-3">
            <Bucket title="Build this week" icon={<Rocket className="size-4" />} items={roadmap.content.thisWeek} numbered />
            <Bucket title="Later" icon={<Clock className="size-4" />} items={roadmap.content.later} />
            <Bucket title="Ignore" icon={<Trash className="size-4" />} items={roadmap.content.ignore} muted />
          </div>
        </>
      ) : (
        <Card className="text-muted-foreground p-6 text-center text-sm">
          {openTaskCount === 0
            ? "Once you have open tasks, Ghost PM can pick the 5 that matter most this week."
            : `You have ${openTaskCount} open task${openTaskCount === 1 ? "" : "s"}. Let Ghost PM pick what to build this week — and what to ignore.`}
        </Card>
      )}
    </section>
  );
}

function Bucket({
  title,
  icon,
  items,
  numbered,
  muted,
}: {
  title: string;
  icon: React.ReactNode;
  items: RoadmapItem[];
  numbered?: boolean;
  muted?: boolean;
}) {
  return (
    <Card className="gap-3 p-4" data-bucket={title}>
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
        <span className="text-muted-foreground ml-auto text-xs">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-xs">Nothing here.</p>
      ) : (
        <ol className="space-y-3">
          {items.map((item, i) => (
            <li key={item.taskId} className={muted ? "opacity-70" : undefined}>
              <div className="flex items-start gap-2 text-sm">
                {numbered && <span className="text-muted-foreground w-4 shrink-0 text-right font-mono text-xs leading-5">{i + 1}.</span>}
                <PriorityBadge priority={item.priority as Priority} className="mt-0.5" />
                <span className="leading-snug font-medium">{item.title}</span>
              </div>
              {item.reason && <p className="text-muted-foreground mt-1 pl-0 text-xs">{item.reason}</p>}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
