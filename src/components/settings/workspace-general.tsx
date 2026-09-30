"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteWorkspace, removeMember, renameWorkspace } from "@/app/actions/workspaces";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function RenameWorkspaceForm({ name, canEdit }: { name: string; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex max-w-md gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const value = String(new FormData(e.currentTarget).get("name") ?? "");
        startTransition(async () => {
          const res = await renameWorkspace(value);
          if (res.ok) toast.success("Workspace renamed");
          else toast.error(res.error);
        });
      }}
    >
      <Input name="name" defaultValue={name} maxLength={60} disabled={!canEdit} aria-label="Workspace name" />
      {canEdit && (
        <Button type="submit" variant="outline" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Save
        </Button>
      )}
    </form>
  );
}

export function DangerZone({
  personal,
  isOwner,
  membershipId,
  name,
}: {
  personal: boolean;
  isOwner: boolean;
  membershipId: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  if (personal) return null;

  const done = () => {
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>Danger zone</CardTitle>
        <CardDescription>These actions can&apos;t be undone.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Leave "${name}"?`)) return;
            startTransition(async () => {
              const res = await removeMember(membershipId);
              if (!res.ok) return void toast.error(res.error);
              toast.success("You left the workspace");
              done();
            });
          }}
        >
          Leave workspace
        </Button>
        {isOwner && (
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (prompt(`Type "${name}" to delete this workspace and all its projects.`) !== name) return;
              startTransition(async () => {
                const res = await deleteWorkspace();
                if (!res.ok) return void toast.error(res.error);
                toast.success("Workspace deleted");
                done();
              });
            }}
          >
            {pending && <Loader2 className="animate-spin" />} Delete workspace
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
