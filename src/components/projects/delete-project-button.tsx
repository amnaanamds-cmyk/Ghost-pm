"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";

export function DeleteProjectButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete "${name}" and all its tasks? This can't be undone.`)) return;
        startTransition(async () => {
          const res = await deleteProject(id);
          if (res && !res.ok) toast.error(res.error);
        });
      }}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
      Delete
    </Button>
  );
}
