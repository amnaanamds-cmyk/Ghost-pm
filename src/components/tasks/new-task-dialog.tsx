"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITIES } from "./types";

export function NewTaskDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus /> Add task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await createTask(projectId, {
                title: String(fd.get("title") ?? ""),
                why: String(fd.get("why") ?? ""),
                priority: fd.get("priority") as "P0" | "P1" | "P2" | "P3",
              });
              if (!res.ok) return void toast.error(res.error);
              toast.success("Task added");
              setOpen(false);
            });
          }}
        >
          <Input name="title" placeholder="Fix the thing" required maxLength={200} aria-label="Title" autoFocus />
          <Textarea name="why" placeholder="Why it matters (optional)" rows={3} maxLength={2000} aria-label="Why" />
          <select
            name="priority"
            defaultValue="P2"
            aria-label="Priority"
            className="border-input dark:bg-input/30 h-9 w-28 rounded-md border bg-transparent px-2 text-sm"
          >
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Add task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
