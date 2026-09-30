"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { PriorityBadge } from "./priority-badge";
import { TaskDialog } from "./task-dialog";
import type { TaskView } from "./types";

export function TaskList({ tasks }: { tasks: TaskView[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = tasks.find((t) => t.id === openId);
  return (
    <>
      <ul className="space-y-2">
        {tasks.map((t) => (
          <li key={t.id}>
            <button onClick={() => setOpenId(t.id)} className="hover:bg-accent/50 w-full rounded-md border p-3 text-left">
              <div className="flex items-center gap-2">
                <PriorityBadge priority={t.priority} />
                <span className="font-medium">{t.title}</span>
                {t.agentPrompt && <Sparkles className="text-muted-foreground ml-auto size-3.5" />}
              </div>
              {t.why && <p className="text-muted-foreground mt-1 text-sm">{t.why}</p>}
            </button>
          </li>
        ))}
      </ul>
      {open && <TaskDialog key={open.id} task={open} open onOpenChange={(o) => !o && setOpenId(null)} />}
    </>
  );
}
