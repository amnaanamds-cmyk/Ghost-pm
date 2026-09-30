import type { Priority } from "@prisma/client";
import { cn } from "@/lib/utils";

const styles: Record<Priority, string> = {
  P0: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  P1: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  P2: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  P3: "bg-muted text-muted-foreground border-border",
};

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span className={cn("inline-flex rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold", styles[priority], className)}>
      {priority}
    </span>
  );
}
