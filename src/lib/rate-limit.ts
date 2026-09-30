import "server-only";
import { db } from "@/lib/db";
import { UserError } from "@/lib/action-result";

export class RateLimitError extends UserError {}

/** Named limits: [max requests, window seconds]. Generous for humans, tight for scripts. */
export const LIMITS = {
  capture: [30, 60],
  agentPrompt: [20, 60],
  planWeek: [10, 60],
  githubPush: [30, 60],
  githubSync: [10, 60],
  invite: [30, 3600],
  export: [20, 60],
  comment: [60, 60],
} as const satisfies Record<string, readonly [number, number]>;

/**
 * Atomically counts a hit in the current window. Returns false when over the limit.
 * One upsert, so it's safe under concurrency.
 */
export async function hit(name: keyof typeof LIMITS, id: string): Promise<boolean> {
  const [max, windowSec] = LIMITS[name];
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "windowStart", "count")
    VALUES (${`${name}:${id}`}, now(), 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSec}) THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSec}) THEN now() ELSE "RateLimit"."windowStart" END
    RETURNING "count"`;
  return rows[0].count <= max;
}

export async function enforce(name: keyof typeof LIMITS, id: string) {
  if (!(await hit(name, id))) throw new RateLimitError("You're doing that too fast — please wait a minute and try again.");
}
