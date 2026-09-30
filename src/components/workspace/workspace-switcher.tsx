"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronsUpDown, Loader2, Plus, Settings, Users } from "lucide-react";
import { toast } from "sonner";
import { createWorkspace, switchWorkspace } from "@/app/actions/workspaces";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

type WS = { id: string; name: string; personal: boolean; plan: "FREE" | "PRO" };

export function WorkspaceSwitcher({ current, workspaces }: { current: WS; workspaces: WS[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);

  function go(id: string) {
    if (id === current.id) return;
    startTransition(async () => {
      const res = await switchWorkspace(id);
      if (!res.ok) return void toast.error(res.error);
      router.push("/dashboard");
      router.refresh();
    });
  }

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "");
    startTransition(async () => {
      const res = await createWorkspace(name);
      if (!res.ok) return void toast.error(res.error);
      setCreating(false);
      toast.success("Workspace created — invite your team from settings");
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="max-w-[55vw] gap-1.5 sm:max-w-xs" aria-label="Switch workspace">
            {pending ? <Loader2 className="animate-spin" /> : <Users />}
            <span className="truncate">{current.name}</span>
            {current.plan === "PRO" && <Badge className="px-1 py-0 text-[10px]">PRO</Badge>}
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-muted-foreground text-xs">Workspaces</DropdownMenuLabel>
          {workspaces.map((w) => (
            <DropdownMenuItem key={w.id} onSelect={() => go(w.id)}>
              <span className="flex-1 truncate">{w.name}</span>
              {w.plan === "PRO" && <Badge variant="secondary" className="px-1 py-0 text-[10px]">PRO</Badge>}
              {w.id === current.id && <Check />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings/workspace">
              <Settings /> Workspace settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setCreating(true)}>
            <Plus /> New workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
            <DialogDescription>A shared space for a team: projects, tasks, roadmap and billing.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreate} className="grid gap-4">
            <Input name="name" required maxLength={60} placeholder="Acme Inc." autoFocus />
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />} Create workspace
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
