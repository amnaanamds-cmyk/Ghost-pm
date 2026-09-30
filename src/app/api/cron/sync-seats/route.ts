import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthorizedCron } from "@/lib/cron";
import { billingEnabled, syncSeats } from "@/lib/billing";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Nightly safety net: reconcile subscription seat counts with membership. */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!billingEnabled()) return NextResponse.json({ ok: true, skipped: "billing disabled" });
  const workspaces = await db.workspace.findMany({
    where: { plan: "PRO", lsSubscriptionItemId: { not: null } },
    select: { id: true },
  });
  for (const w of workspaces) await syncSeats(w.id);
  return NextResponse.json({ ok: true, checked: workspaces.length });
}
