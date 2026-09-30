import "server-only";
import { db } from "@/lib/db";

export const FREE_TASK_LIMIT = Number(process.env.FREE_TASKS_PER_MONTH) || 20;

export class LimitError extends Error {}

const currentPeriod = () => new Date().toISOString().slice(0, 7); // "YYYY-MM" UTC

export type Usage = { plan: "FREE" | "PRO"; used: number; limit: number | null; remaining: number };

/** Current month's task usage, resetting the counter when a new month starts. */
export async function getUsage(userId: string): Promise<Usage> {
  const period = currentPeriod();
  await db.user.updateMany({
    where: { id: userId, OR: [{ usagePeriod: null }, { usagePeriod: { not: period } }] },
    data: { usagePeriod: period, tasksThisPeriod: 0 },
  });
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { plan: true, tasksThisPeriod: true },
  });
  if (user.plan === "PRO") return { plan: "PRO", used: user.tasksThisPeriod, limit: null, remaining: Infinity };
  return {
    plan: "FREE",
    used: user.tasksThisPeriod,
    limit: FREE_TASK_LIMIT,
    remaining: Math.max(0, FREE_TASK_LIMIT - user.tasksThisPeriod),
  };
}

/** Throws a friendly LimitError if the user can't create any more tasks this month. */
export async function assertCanCreateTasks(userId: string) {
  const usage = await getUsage(userId);
  if (usage.remaining <= 0) {
    throw new LimitError(
      `You've used all ${usage.limit} tasks on the Free plan this month. Upgrade to Pro for unlimited tasks.`
    );
  }
  return usage;
}

/** Records `count` new tasks against the user's monthly quota. */
export async function recordTasks(userId: string, count: number) {
  if (count > 0) await db.user.update({ where: { id: userId }, data: { tasksThisPeriod: { increment: count } } });
}
