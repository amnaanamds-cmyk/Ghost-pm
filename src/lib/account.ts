import "server-only";
import { db } from "@/lib/db";
import { UserError } from "@/lib/action-result";
import { hasLiveSubscription } from "@/lib/billing";
import { deleteImages, imageRefsFor } from "@/lib/storage";

/**
 * Workspaces that would block deleting this account: team workspaces where the user is the only
 * owner but other members remain, and workspaces with an active subscription that would be deleted.
 */
export async function accountDeletionPlan(userId: string) {
  const memberships = await db.membership.findMany({
    where: { userId },
    include: {
      workspace: {
        include: { _count: { select: { members: true } }, members: { where: { role: "OWNER" }, select: { userId: true } } },
      },
    },
  });
  const toDelete: string[] = [];
  const blockers: string[] = [];
  for (const m of memberships) {
    const ws = m.workspace;
    const soleMember = ws._count.members === 1;
    const soleOwner = m.role === "OWNER" && ws.members.length === 1;
    if (ws.personal || soleMember) {
      if (hasLiveSubscription(ws)) {
        blockers.push(`Cancel the Pro subscription on "${ws.name}" first (Settings → Billing).`);
      } else toDelete.push(ws.id);
    } else if (soleOwner) {
      blockers.push(`You're the only owner of "${ws.name}". Make someone else an owner, or remove its members.`);
    }
  }
  return { toDelete, blockers };
}

export async function deleteAccount(userId: string) {
  const { toDelete, blockers } = await accountDeletionPlan(userId);
  if (blockers.length) throw new UserError(blockers.join(" "));
  const images = await imageRefsFor({ userWorkspaceIds: toDelete });
  await db.$transaction([
    db.workspace.deleteMany({ where: { id: { in: toDelete } } }),
    // Cascades: accounts (GitHub token), sessions, memberships. Content in shared workspaces is kept
    // with authorship set to null (createdBy / assignee / comment author).
    db.user.delete({ where: { id: userId } }),
  ]);
  await deleteImages(images);
}

/** Everything we hold about the user, as JSON (GDPR Art. 15 / 20). Screenshots are referenced, not inlined. */
export async function exportAccountData(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true, githubLogin: true, emailDigest: true, createdAt: true },
  });
  const memberships = await db.membership.findMany({
    where: { userId },
    select: {
      role: true,
      createdAt: true,
      workspace: {
        select: {
          id: true,
          name: true,
          personal: true,
          plan: true,
          seats: true,
          subscriptionStatus: true,
          projects: {
            select: {
              id: true,
              name: true,
              description: true,
              techStack: true,
              githubRepo: true,
              createdAt: true,
              captures: { select: { id: true, text: true, source: true, createdAt: true, imageUrl: true } },
              tasks: {
                select: {
                  id: true,
                  title: true,
                  why: true,
                  priority: true,
                  status: true,
                  agentPrompt: true,
                  githubIssueUrl: true,
                  createdAt: true,
                  comments: { select: { body: true, createdAt: true, authorId: true } },
                },
              },
              roadmaps: { select: { weekStart: true, content: true, createdAt: true } },
            },
          },
        },
      },
    },
  });
  return {
    exportedAt: new Date().toISOString(),
    user,
    workspaces: memberships.map((m) => ({
      role: m.role,
      joinedAt: m.createdAt,
      ...m.workspace,
      projects: m.workspace.projects.map((p) => ({
        ...p,
        captures: p.captures.map(({ imageUrl, ...c }) => ({
          ...c,
          screenshot: imageUrl ? `/api/captures/${c.id}/image` : null,
        })),
      })),
    })),
  };
}
