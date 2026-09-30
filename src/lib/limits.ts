import "server-only";
import { UserError } from "@/lib/action-result";
import { db } from "@/lib/db";
import { effectivePlan } from "@/lib/billing";

export const FREE_TASK_LIMIT = Number(process.env.FREE_TASKS_PER_MONTH) || 20;

export class LimitError extends UserError {}

const currentPeriod = () => new Date().toISOString().slice(0, 7); // "YYYY-MM" UTC

export type Usage = { plan: "FREE" | "PRO"; used: number; limit: number | null; remaining: number };

/** A workspace's task usage this month, resetting the counter when a new month starts. */
export async function getUsage(workspaceId: string): Promise<Usage> {
  const period = currentPeriod();
  await db.workspace.updateMany({
    where: { id: workspaceId, OR: [{ usagePeriod: null }, { usagePeriod: { not: period } }] },
    data: { usagePeriod: period, tasksThisPeriod: 0 },
  });
  const ws = await db.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { plan: true, tasksThisPeriod: true, subscriptionStatus: true, currentPeriodEnd: true },
  });
  if (effectivePlan(ws) === "PRO") return { plan: "PRO", used: ws.tasksThisPeriod, limit: null, remaining: Infinity };
  return {
    plan: "FREE",
    used: ws.tasksThisPeriod,
    limit: FREE_TASK_LIMIT,
    remaining: Math.max(0, FREE_TASK_LIMIT - ws.tasksThisPeriod),
  };
}

/** Throws a friendly LimitError if the workspace can't create any more tasks this month. */
export async function assertCanCreateTasks(workspaceId: string) {
  const usage = await getUsage(workspaceId);
  if (usage.remaining <= 0) {
    throw new LimitError(
      `You've used all ${usage.limit} tasks on the Free plan this month. Upgrade to Pro for unlimited tasks.`
    );
  }
  return usage;
}

/**
 * Records `count` new tasks against the workspace's monthly quota. Period-aware and atomic: if the
 * stored period is stale (or unset), the counter restarts at `count` for the current month.
 */
export async function recordTasks(workspaceId: string, count: number) {
  if (count <= 0) return;
  const period = currentPeriod();
  await db.$executeRaw`
    UPDATE "Workspace" SET
      "tasksThisPeriod" = CASE WHEN "usagePeriod" = ${period} THEN "tasksThisPeriod" + ${count} ELSE ${count} END,
      "usagePeriod" = ${period}
    WHERE "id" = ${workspaceId}`;
}
