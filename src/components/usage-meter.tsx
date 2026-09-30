import Link from "next/link";
import type { Usage } from "@/lib/limits";
import { cn } from "@/lib/utils";

export function UsageMeter({ usage, className }: { usage: Usage; className?: string }) {
  if (usage.limit === null) {
    return <p className={cn("text-muted-foreground text-xs", className)}>Pro plan · unlimited tasks</p>;
  }
  const pct = Math.min(100, (usage.used / usage.limit) * 100);
  const out = usage.remaining === 0;
  return (
    <div className={cn("flex items-center gap-3 text-xs", className)}>
      <div className="bg-muted h-1.5 w-24 overflow-hidden rounded-full" aria-hidden>
        <div className={cn("h-full rounded-full", out ? "bg-destructive" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("text-muted-foreground", out && "text-destructive")}>
        {usage.used}/{usage.limit} tasks this month
      </span>
      {usage.remaining <= 5 && (
        <Link href="/#pricing" className="font-medium underline-offset-4 hover:underline">
          Upgrade
        </Link>
      )}
    </div>
  );
}
