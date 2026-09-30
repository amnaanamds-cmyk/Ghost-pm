"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { appUrl } from "@/lib/url";
import { WORKSPACE_COOKIE, assertRole, requireWorkspace, ForbiddenError } from "@/lib/workspace";
import { actionError, type ActionResult } from "@/lib/action-result";
import { effectivePlan, syncSeats } from "@/lib/billing";

const INVITE_TTL_DAYS = 7;
const nameSchema = z.string().trim().min(1, "Name is required").max(60);

async function setCurrentWorkspace(workspaceId: string) {
  (await cookies()).set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function switchWorkspace(workspaceId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const m = await db.membership.findUnique({ where: { workspaceId_userId: { workspaceId, userId } } });
    if (!m) return { ok: false, error: "Workspace not found" };
    await setCurrentWorkspace(workspaceId);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function createWorkspace(name: string): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const ws = await db.workspace.create({
      data: { name: nameSchema.parse(name), members: { create: { userId, role: "OWNER" } } },
    });
    await setCurrentWorkspace(ws.id);
    revalidatePath("/", "layout");
    return { ok: true, data: { id: ws.id } };
  } catch (e) {
    return actionError(e);
  }
}

export async function renameWorkspace(name: string): Promise<ActionResult> {
  try {
    const { workspace, membership } = await requireWorkspace();
    assertRole(membership, "ADMIN");
    await db.workspace.update({ where: { id: workspace.id }, data: { name: nameSchema.parse(name) } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteWorkspace(): Promise<ActionResult> {
  try {
    const { workspace, membership } = await requireWorkspace();
    assertRole(membership, "OWNER");
    if (workspace.personal) return { ok: false, error: "Your personal workspace can't be deleted." };
    if (effectivePlan(workspace) === "PRO" && workspace.subscriptionStatus !== "cancelled") {
      return { ok: false, error: "Cancel the Pro subscription (Settings → Billing) before deleting." };
    }
    await db.workspace.delete({ where: { id: workspace.id } });
    (await cookies()).delete(WORKSPACE_COOKIE);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

// ---------- Invites ----------

const inviteSchema = z.object({
  email: z.string().trim().email("Invalid email").or(z.literal("")).optional(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export async function createInvite(input: z.input<typeof inviteSchema>): Promise<ActionResult<{ url: string }>> {
  try {
    const { userId, workspace, membership } = await requireWorkspace();
    assertRole(membership, "ADMIN");
    const { email, role } = inviteSchema.parse(input);
    const invite = await db.invite.create({
      data: {
        workspaceId: workspace.id,
        email: email || null,
        role,
        token: randomBytes(24).toString("base64url"),
        invitedById: userId,
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
      },
    });
    const url = `${await appUrl()}/invite/${invite.token}`;
    revalidatePath("/settings/workspace");
    return { ok: true, data: { url } };
  } catch (e) {
    return actionError(e);
  }
}

export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  try {
    const { workspace, membership } = await requireWorkspace();
    assertRole(membership, "ADMIN");
    await db.invite.deleteMany({ where: { id: inviteId, workspaceId: workspace.id, acceptedAt: null } });
    revalidatePath("/settings/workspace");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

/** Joins the workspace behind an invite link. The link itself is the credential (single use, expires). */
export async function acceptInvite(token: string): Promise<ActionResult<{ workspaceId: string }>> {
  try {
    const userId = await requireUserId();
    const invite = await db.invite.findUnique({ where: { token } });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      return { ok: false, error: "This invite link is invalid or has expired. Ask for a new one." };
    }
    await db.$transaction(async (tx) => {
      const existing = await tx.membership.findUnique({
        where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
      });
      if (!existing) {
        await tx.membership.create({ data: { workspaceId: invite.workspaceId, userId, role: invite.role } });
      }
      // Conditional update makes the link single-use even under concurrent accepts.
      const claimed = await tx.invite.updateMany({
        where: { id: invite.id, acceptedAt: null },
        data: { acceptedAt: new Date() },
      });
      if (claimed.count === 0 && !existing) throw new Error("This invite was just used by someone else.");
    });
    await setCurrentWorkspace(invite.workspaceId);
    await syncSeats(invite.workspaceId);
    revalidatePath("/", "layout");
    return { ok: true, data: { workspaceId: invite.workspaceId } };
  } catch (e) {
    return actionError(e);
  }
}

// ---------- Members ----------

async function ownerCount(workspaceId: string) {
  return db.membership.count({ where: { workspaceId, role: "OWNER" } });
}

export async function updateMemberRole(membershipId: string, role: Role): Promise<ActionResult> {
  try {
    const { workspace, membership } = await requireWorkspace();
    assertRole(membership, "OWNER");
    const target = await db.membership.findFirst({ where: { id: membershipId, workspaceId: workspace.id } });
    if (!target) return { ok: false, error: "Member not found" };
    z.enum(["OWNER", "ADMIN", "MEMBER"]).parse(role);
    if (target.role === "OWNER" && role !== "OWNER" && (await ownerCount(workspace.id)) <= 1) {
      return { ok: false, error: "A workspace needs at least one owner. Promote someone else first." };
    }
    await db.membership.update({ where: { id: target.id }, data: { role } });
    revalidatePath("/settings/workspace");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

/** Removes a member (admins), or leaves the workspace (when removing yourself). */
export async function removeMember(membershipId: string): Promise<ActionResult> {
  try {
    const { userId, workspace, membership } = await requireWorkspace();
    const target = await db.membership.findFirst({ where: { id: membershipId, workspaceId: workspace.id } });
    if (!target) return { ok: false, error: "Member not found" };
    const self = target.userId === userId;
    if (!self) assertRole(membership, target.role === "OWNER" ? "OWNER" : "ADMIN");
    if (self && workspace.personal) throw new ForbiddenError("You can't leave your personal workspace.");
    if (target.role === "OWNER" && (await ownerCount(workspace.id)) <= 1) {
      return { ok: false, error: "The last owner can't leave. Transfer ownership or delete the workspace." };
    }
    await db.$transaction([
      db.task.updateMany({
        where: { assigneeId: target.userId, project: { workspaceId: workspace.id } },
        data: { assigneeId: null },
      }),
      db.membership.delete({ where: { id: target.id } }),
    ]);
    if (self) (await cookies()).delete(WORKSPACE_COOKIE);
    await syncSeats(workspace.id);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}
