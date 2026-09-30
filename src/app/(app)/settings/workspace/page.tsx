import { db } from "@/lib/db";
import { hasRole, requireWorkspace } from "@/lib/workspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RenameWorkspaceForm, DangerZone } from "@/components/settings/workspace-general";
import { MembersList } from "@/components/settings/members-list";
import { InvitePanel } from "@/components/settings/invite-panel";

export default async function WorkspaceSettingsPage() {
  const { userId, workspace, membership } = await requireWorkspace();
  const [members, invites] = await Promise.all([
    db.membership.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, image: true, githubLogin: true } },
      },
    }),
    db.invite.findMany({
      where: { workspaceId: workspace.id, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, expiresAt: true },
    }),
  ]);
  const isAdmin = hasRole(membership.role, "ADMIN");

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            {workspace.personal ? "Your personal workspace." : "A shared team workspace."} Plan:{" "}
            <span className="font-medium">{workspace.plan === "PRO" ? "Pro" : "Free"}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RenameWorkspaceForm name={workspace.name} canEdit={isAdmin} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Owners manage billing and roles. Admins invite and remove people. Members work on projects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <MembersList
            members={members.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
            currentUserId={userId}
            currentRole={membership.role}
          />
          {isAdmin && (
            <InvitePanel invites={invites.map((i) => ({ ...i, expiresAt: i.expiresAt.toISOString() }))} />
          )}
        </CardContent>
      </Card>

      <DangerZone
        personal={workspace.personal}
        isOwner={membership.role === "OWNER"}
        membershipId={membership.id}
        name={workspace.name}
      />
    </div>
  );
}
