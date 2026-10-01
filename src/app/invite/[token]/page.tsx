import { Ghost } from "lucide-react";
import { auth, signIn } from "@/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GithubIcon } from "@/components/github-icon";
import { AcceptInviteButton } from "@/components/workspace/accept-invite-button";
import { DevSignIn } from "@/components/dev-sign-in";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();
  const invite = await db.invite.findUnique({
    where: { token },
    include: { workspace: { select: { name: true } }, invitedBy: { select: { name: true, githubLogin: true } } },
  });
  const valid = invite && !invite.acceptedAt && invite.expiresAt > new Date();

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-md items-center gap-4 p-8 text-center">
        <Ghost className="size-10" />
        {!valid ? (
          <>
            <h1 className="text-xl font-semibold">Invite not valid</h1>
            <p className="text-muted-foreground text-sm">
              This invite link has expired or was already used. Ask your teammate for a new one.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Join {invite.workspace.name}</h1>
            <p className="text-muted-foreground text-sm">
              {invite.invitedBy?.name || invite.invitedBy?.githubLogin || "A teammate"} invited you to collaborate on
              Ghost PM as {invite.role === "ADMIN" ? "an admin" : "a member"}.
            </p>
            {session?.user ? (
              <AcceptInviteButton token={token} />
            ) : (
              <form
                action={async () => {
                  "use server";
                  await signIn("github", { redirectTo: `/invite/${token}` });
                }}
              >
                <Button type="submit" size="lg">
                  <GithubIcon /> Sign in with GitHub to join
                </Button>
              </form>
            )}
            {!session?.user && (
              <DevSignIn redirectTo={`/invite/${token}`} />
            )}
          </>
        )}
      </Card>
    </main>
  );
}
