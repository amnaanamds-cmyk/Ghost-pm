"use server";

import { auth } from "@/auth";
import { assertRole, requireWorkspace } from "@/lib/workspace";
import { createProCheckout, customerPortalUrl } from "@/lib/billing";
import { appUrl } from "@/lib/url";
import { actionError, type ActionResult } from "@/lib/action-result";

export async function startCheckout(): Promise<ActionResult<{ url: string }>> {
  try {
    const { workspace, membership } = await requireWorkspace();
    assertRole(membership, "OWNER");
    if (workspace.lsSubscriptionId && workspace.subscriptionStatus !== "expired") {
      return { ok: false, error: "This workspace already has a subscription — use Manage billing." };
    }
    const session = await auth();
    const url = await createProCheckout({
      workspace,
      email: session?.user?.email,
      name: session?.user?.name,
      redirectUrl: `${await appUrl()}/settings/billing?checkout=success`,
    });
    return { ok: true, data: { url } };
  } catch (e) {
    return actionError(e);
  }
}

export async function openBillingPortal(): Promise<ActionResult<{ url: string }>> {
  try {
    const { workspace, membership } = await requireWorkspace();
    assertRole(membership, "OWNER");
    if (!workspace.lsSubscriptionId) return { ok: false, error: "No subscription yet." };
    return { ok: true, data: { url: await customerPortalUrl(workspace.lsSubscriptionId) } };
  } catch (e) {
    return actionError(e);
  }
}
