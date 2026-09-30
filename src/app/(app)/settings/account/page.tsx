import { Download } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { accountDeletionPlan } from "@/lib/account";
import { emailEnabled } from "@/lib/email";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccountCard, DigestToggle } from "@/components/settings/account-forms";

export default async function AccountSettingsPage() {
  const userId = await requireUserId();
  const [user, plan] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    accountDeletionPlan(userId),
  ]);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Synced from GitHub each time you sign in.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Avatar person={user} className="size-12" />
          <div className="text-sm">
            <p className="font-medium">{user.name}</p>
            <p className="text-muted-foreground">
              {user.githubLogin && `@${user.githubLogin} · `}
              {user.email ?? "No public email on GitHub"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>
            {emailEnabled() ? "Transactional emails (invites) are always sent." : "Email isn't configured on this server."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DigestToggle enabled={user.emailDigest} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
          <CardDescription>
            Download everything we store about you and your workspaces as JSON: profile, projects, captures, tasks,
            comments and roadmaps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <a href="/api/account/export" download>
              <Download /> Export my data
            </a>
          </Button>
        </CardContent>
      </Card>

      <DeleteAccountCard blockers={plan.blockers} workspacesDeleted={plan.toDelete.length} />
    </div>
  );
}
