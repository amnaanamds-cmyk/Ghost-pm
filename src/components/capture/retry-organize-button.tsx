"use client";

import { useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { reorganizeCapture } from "@/app/actions/captures";
import { Button } from "@/components/ui/button";

export function RetryOrganizeButton({ captureId }: { captureId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await reorganizeCapture(captureId);
          if (!res.ok) return void toast.error(res.error);
          if (res.data.aiError) toast.error(res.data.aiError);
          else toast.success(`${res.data.taskCount} task${res.data.taskCount === 1 ? "" : "s"} created`);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
      Organize
    </Button>
  );
}
