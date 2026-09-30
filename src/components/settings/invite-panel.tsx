"use client";

import { useState, useTransition } from "react";
import { Link2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createInvite, revokeInvite } from "@/app/actions/workspaces";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Invite = { id: string; email: string | null; role: string; expiresAt: string };

export function InvitePanel({ invites }: { invites: Invite[] }) {
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const form = e.currentTarget;
          startTransition(async () => {
            const res = await createInvite({
              email: String(fd.get("email") ?? ""),
              role: fd.get("role") as "ADMIN" | "MEMBER",
            });
            if (!res.ok) return void toast.error(res.error);
            setLink(res.data.url);
            form.reset();
            toast.success("Invite link created");
          });
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="invite-email">Invite a teammate</Label>
          <Input id="invite-email" name="email" type="email" placeholder="teammate@company.com (optional)" />
        </div>
        <select
          name="role"
          aria-label="Invite role"
          defaultValue="MEMBER"
          className="border-input dark:bg-input/30 h-9 rounded-md border bg-transparent px-2 text-sm"
        >
          <option value="MEMBER">Member</option>
          <option value="ADMIN">Admin</option>
        </select>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Link2 />} Create invite link
        </Button>
      </form>

      {link && (
        <div className="bg-muted flex items-center gap-2 rounded-md p-2">
          <code className="flex-1 truncate text-xs" data-invite-link>
            {link}
          </code>
          <CopyButton text={link} />
        </div>
      )}

      {invites.length > 0 && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium">Pending invites</p>
          <ul className="divide-y rounded-md border text-sm">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center gap-3 p-2 pl-3">
                <span className="flex-1 truncate">{i.email || "Anyone with the link"}</span>
                <span className="text-muted-foreground text-xs">
                  {i.role.toLowerCase()} · expires {new Date(i.expiresAt).toLocaleDateString()}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Revoke invite"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await revokeInvite(i.id);
                      if (res.ok) toast.success("Invite revoked");
                      else toast.error(res.error);
                    })
                  }
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
