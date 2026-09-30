import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { handleSubscriptionEvent } from "@/lib/billing";
import { makeUser, makeWorkspace, resetDb } from "../setup/db";

const event = (wsId: string, status: string, updatedAt: string, extra: Record<string, unknown> = {}) => ({
  meta: { event_name: `subscription_${status}`, custom_data: { workspace_id: wsId } },
  data: {
    type: "subscriptions",
    id: "sub_1",
    attributes: {
      customer_id: 42,
      status,
      renews_at: "2030-01-01T00:00:00Z",
      ends_at: status === "cancelled" || status === "expired" ? "2030-01-01T00:00:00Z" : null,
      updated_at: updatedAt,
      first_subscription_item: { id: 7, quantity: 3 },
      ...extra,
    },
  },
});

describe("Lemon Squeezy subscription webhooks", () => {
  let wsId: string;
  beforeEach(async () => {
    await resetDb();
    const u = await makeUser();
    wsId = (await makeWorkspace(u.id)).id;
  });

  it("activates Pro and records subscription details", async () => {
    await handleSubscriptionEvent(event(wsId, "active", "2026-01-01T00:00:00Z"));
    const ws = await db.workspace.findUniqueOrThrow({ where: { id: wsId } });
    expect(ws).toMatchObject({ plan: "PRO", subscriptionStatus: "active", lsSubscriptionId: "sub_1", lsSubscriptionItemId: "7", seats: 3 });
  });

  it("ignores events older than the last applied one", async () => {
    await handleSubscriptionEvent(event(wsId, "active", "2026-01-02T00:00:00Z"));
    const res = await handleSubscriptionEvent(event(wsId, "expired", "2026-01-01T00:00:00Z"));
    expect(res).toMatch(/stale/);
    expect((await db.workspace.findUniqueOrThrow({ where: { id: wsId } })).plan).toBe("PRO");
  });

  it("keeps Pro while cancelled, drops it when expired", async () => {
    await handleSubscriptionEvent(event(wsId, "active", "2026-01-01T00:00:00Z"));
    await handleSubscriptionEvent(event(wsId, "cancelled", "2026-01-02T00:00:00Z"));
    expect((await db.workspace.findUniqueOrThrow({ where: { id: wsId } })).plan).toBe("PRO");
    await handleSubscriptionEvent(event(wsId, "expired", "2026-01-03T00:00:00Z"));
    expect((await db.workspace.findUniqueOrThrow({ where: { id: wsId } })).plan).toBe("FREE");
  });

  it("finds the workspace by subscription id even without custom data", async () => {
    await handleSubscriptionEvent(event(wsId, "active", "2026-01-01T00:00:00Z"));
    const e = event(wsId, "past_due", "2026-01-02T00:00:00Z");
    e.meta.custom_data = {} as never;
    await handleSubscriptionEvent(e);
    expect((await db.workspace.findUniqueOrThrow({ where: { id: wsId } })).subscriptionStatus).toBe("past_due");
  });

  it("ignores unknown workspaces", async () => {
    expect(await handleSubscriptionEvent(event("nope", "active", "2026-01-01T00:00:00Z"))).toMatch(/unknown/);
  });
});
