"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { getProjectForUser } from "@/lib/workspace";
import { planWeek } from "@/lib/roadmap";
import { actionError, type ActionResult } from "@/lib/action-result";

export async function planMyWeek(projectId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await getProjectForUser(userId, projectId);
    await planWeek(projectId);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    return actionError(e, "Failed to plan the week");
  }
}
