"use client";

import { useTransition } from "react";
import type { Role } from "@prisma/client";
import { UserMinus } from "lucide-react";
import { toast } from "sonner";
import { removeMember, updateMemberRole } from "@/app/actions/workspaces";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Member = {
  id: string;
  role: Role;
  user: { id: string; name: string | null; email: string | null; image: string | null; githubLogin: string | null };
};

const RANK: Record<Role, number> = { MEMBER: 0, ADMIN: 1, OWNER: 2 };

export function MembersList({
  members,
  currentUserId,
  currentRole,
}: {
  members: Member[];
  currentUserId: string;
  currentRole: Role;
}) {
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(success);
      else toast.error(res.error);
    });

  return (
    <ul className="divide-y rounded-md border">
      {members.map((m) => {
        const self = m.user.id === currentUserId;
        const canRemove = !self && RANK[currentRole] >= Math.max(RANK.ADMIN, RANK[m.role]);
        return (
          <li key={m.id} className="flex flex-wrap items-center gap-3 p-3" data-member={m.user.githubLogin ?? m.user.name}>
            <Avatar person={m.user} className="size-8" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {m.user.name || m.user.githubLogin} {self && <span className="text-muted-foreground">(you)</span>}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {m.user.githubLogin ? `@${m.user.githubLogin}` : m.user.email}
              </p>
            </div>
            {currentRole === "OWNER" ? (
              <select
                aria-label={`Role for ${m.user.name ?? "member"}`}
                className="border-input dark:bg-input/30 h-8 rounded-md border bg-transparent px-2 text-sm"
                value={m.role}
                disabled={pending}
                onChange={(e) => run(() => updateMemberRole(m.id, e.target.value as Role), "Role updated")}
              >
                <option value="OWNER">Owner</option>
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
              </select>
            ) : (
              <Badge variant="secondary">{m.role.toLowerCase()}</Badge>
            )}
            {canRemove && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${m.user.name ?? "member"}`}
                disabled={pending}
                onClick={() => {
                  if (confirm(`Remove ${m.user.name ?? "this member"} from the workspace?`))
                    run(() => removeMember(m.id), "Member removed");
                }}
              >
                <UserMinus />
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
