import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Membership, Role, Workspace } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";

export const WORKSPACE_COOKIE = "gpm_ws";

const RANK: Record<Role, number> = { MEMBER: 0, ADMIN: 1, OWNER: 2 };
export const hasRole = (role: Role, min: Role) => RANK[role] >= RANK[min];

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
  }
}

export function assertRole(membership: Pick<Membership, "role">, min: Role) {
  if (!hasRole(membership.role, min)) throw new ForbiddenError(`Only workspace ${min.toLowerCase()}s can do that.`);
}

/** Creates the user's personal workspace if they have no memberships at all. */
export async function ensurePersonalWorkspace(user: { id: string; name?: string | null }) {
  const existing = await db.membership.findFirst({ where: { userId: user.id } });
  if (existing) return existing.workspaceId;
  const ws = await db.workspace.create({
    data: {
      name: `${user.name || "My"}'s workspace`,
      personal: true,
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  return ws.id;
}

export type CurrentWorkspace = { userId: string; workspace: Workspace; membership: Membership };

/**
 * The workspace the user is working in (from the switcher cookie), falling back to their oldest
 * membership. Cached per request.
 */
export const requireWorkspace = cache(async (): Promise<CurrentWorkspace> => {
  const userId = await requireUserId();
  const preferred = (await cookies()).get(WORKSPACE_COOKIE)?.value;

  let membership = preferred
    ? await db.membership.findUnique({
        where: { workspaceId_userId: { workspaceId: preferred, userId } },
        include: { workspace: true },
      })
    : null;
  membership ??= await db.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { workspace: true },
  });
  if (!membership) {
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    const workspaceId = await ensurePersonalWorkspace(user);
    membership = await db.membership.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { workspace: true },
    });
  }
  const { workspace, ...m } = membership;
  return { userId, workspace, membership: m };
});

export async function listMyWorkspaces(userId: string) {
  return db.membership.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { role: true, workspace: { select: { id: true, name: true, personal: true, plan: true } } },
  });
}

/** Loads a project the user can access (member of its workspace), or 404s. */
export async function getProjectForUser(userId: string, projectId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, workspace: { members: { some: { userId } } } },
    include: { workspace: { include: { members: { where: { userId } } } } },
  });
  if (!project) notFound();
  const { workspace, ...rest } = project;
  const { members, ...ws } = workspace;
  return { project: rest, workspace: ws, membership: members[0] };
}

/** Where-clause fragment: rows whose project is in a workspace the user belongs to. */
export const memberOfProject = (userId: string) => ({ project: { workspace: { members: { some: { userId } } } } });
