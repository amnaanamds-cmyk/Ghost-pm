import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { hit, LIMITS } from "@/lib/rate-limit";
import { resetDb } from "../setup/db";

describe("rate limiter", () => {
  beforeEach(resetDb);

  it("allows up to the limit, then blocks", async () => {
    const [max] = LIMITS.planWeek;
    const results = [];
    for (let i = 0; i < max + 2; i++) results.push(await hit("planWeek", "user-1"));
    expect(results.filter(Boolean)).toHaveLength(max);
    expect(results.slice(-2)).toEqual([false, false]);
  });

  it("is isolated per key", async () => {
    for (let i = 0; i < LIMITS.planWeek[0]; i++) await hit("planWeek", "a");
    expect(await hit("planWeek", "a")).toBe(false);
    expect(await hit("planWeek", "b")).toBe(true);
  });

  it("resets after the window", async () => {
    for (let i = 0; i < LIMITS.planWeek[0] + 1; i++) await hit("planWeek", "u");
    await db.$executeRaw`UPDATE "RateLimit" SET "windowStart" = now() - interval '1 hour'`;
    expect(await hit("planWeek", "u")).toBe(true);
  });

  it("counts correctly under concurrency", async () => {
    const [max] = LIMITS.capture;
    const results = await Promise.all(Array.from({ length: max + 10 }, () => hit("capture", "burst")));
    expect(results.filter(Boolean)).toHaveLength(max);
  });
});
