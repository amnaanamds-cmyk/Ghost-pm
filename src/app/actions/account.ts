"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { signOut } from "@/auth";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { deleteAccount } from "@/lib/account";
import { actionError, UserError, type ActionResult } from "@/lib/action-result";

export async function setEmailDigest(enabled: boolean): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await db.user.update({ where: { id: userId }, data: { emailDigest: z.boolean().parse(enabled) } });
    revalidatePath("/settings/account");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteMyAccount(confirmation: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    if (confirmation.trim().toLowerCase() !== "delete my account") {
      throw new UserError('Type "delete my account" to confirm.');
    }
    await deleteAccount(userId);
  } catch (e) {
    return actionError(e, "Couldn't delete your account — please contact support.");
  }
  await signOut({ redirectTo: "/?deleted=1" });
  return { ok: true };
}
