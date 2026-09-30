"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { actionError, UserError, type ActionResult } from "@/lib/action-result";

/** Manually grant or remove Pro (comps, support cases). Refuses to override a live subscription. */
export async function adminSetPlan(workspaceId: string, plan: "FREE" | "PRO"): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const ws = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    if (ws.lsSubscriptionId && ws.subscriptionStatus && ws.subscriptionStatus !== "expired") {
      throw new UserError("This workspace has a Lemon Squeezy subscription — manage it there.");
    }
    await db.workspace.update({ where: { id: workspaceId }, data: { plan: z.enum(["FREE", "PRO"]).parse(plan) } });
    console.info(`[admin] ${admin.email ?? admin.id} set ${workspaceId} plan=${plan}`);
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function adminResetUsage(workspaceId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    await db.workspace.update({ where: { id: workspaceId }, data: { tasksThisPeriod: 0 } });
    console.info(`[admin] ${admin.email ?? admin.id} reset usage for ${workspaceId}`);
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}
