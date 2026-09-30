"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMyAccount, setEmailDigest } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function DigestToggle({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 size-4"
        defaultChecked={enabled}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          startTransition(async () => {
            const res = await setEmailDigest(next);
            if (res.ok) toast.success(next ? "Weekly digest on" : "Weekly digest off");
            else toast.error(res.error);
          });
        }}
      />
      <span>
        <span className="font-medium">Weekly digest</span>
        <span className="text-muted-foreground block">Monday summary of what to build this week in each workspace.</span>
      </span>
    </label>
  );
}

export function DeleteAccountCard({ blockers, workspacesDeleted }: { blockers: string[]; workspacesDeleted: number }) {
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>Delete account</CardTitle>
        <CardDescription>
          Permanently deletes your profile, GitHub connection and {workspacesDeleted} workspace
          {workspacesDeleted === 1 ? "" : "s"} only you belong to (with their projects and screenshots). Content in
          shared workspaces stays with the team. This can&apos;t be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {blockers.length > 0 ? (
          <ul className="text-destructive space-y-1 text-sm" data-delete-blockers>
            {blockers.map((b) => (
              <li key={b}>• {b}</li>
            ))}
          </ul>
        ) : (
          <form
            className="flex max-w-md flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const res = await deleteMyAccount(confirm);
                if (res && !res.ok) toast.error(res.error);
              });
            }}
          >
            <Input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder='Type "delete my account"'
              aria-label="Confirm account deletion"
            />
            <Button variant="destructive" disabled={pending || confirm.trim().toLowerCase() !== "delete my account"}>
              {pending && <Loader2 className="animate-spin" />} Delete account
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
