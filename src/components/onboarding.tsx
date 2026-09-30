"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Inbox, Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { createSampleProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const steps = [
  { icon: Inbox, title: "Create a project", body: "Describe your app and stack — Ghost PM uses it as context." },
  { icon: Wand2, title: "Dump anything", body: "Type, talk or paste a screenshot. AI turns it into prioritized tasks." },
  { icon: Sparkles, title: "Hand off to your agent", body: "Generate a prompt for Claude Code or Cursor, or push to GitHub." },
  { icon: CalendarRange, title: "Plan your week", body: "Ghost PM picks the 5 things worth building now." },
];

export function Onboarding({ createButton }: { createButton: React.ReactNode }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Card className="gap-6 p-6 sm:p-8">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Welcome to Ghost PM 👋</h2>
        <p className="text-muted-foreground text-sm">Your AI product manager. Here&apos;s how it works:</p>
      </div>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-[11px]">
                {i + 1}
              </span>
              <s.icon className="size-4" /> {s.title}
            </div>
            <p className="text-muted-foreground text-sm">{s.body}</p>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        {createButton}
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await createSampleProject();
              if (!res.ok) return void toast.error(res.error);
              router.push(`/projects/${res.data.id}`);
            })
          }
        >
          {pending && <Loader2 className="animate-spin" />} Explore a sample project
        </Button>
      </div>
    </Card>
  );
}
