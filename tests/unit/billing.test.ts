import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { effectivePlan, hasLiveSubscription, verifySignature } from "@/lib/billing";

describe("verifySignature", () => {
  const body = JSON.stringify({ meta: { event_name: "subscription_created" } });
  const sig = createHmac("sha256", "whsec_test").update(body).digest("hex");
  it("accepts a valid HMAC", () => expect(verifySignature(body, sig)).toBe(true));
  it("rejects a wrong or missing signature", () => {
    expect(verifySignature(body, "00" + sig.slice(2))).toBe(false);
    expect(verifySignature(body, null)).toBe(false);
    expect(verifySignature(body + " ", sig)).toBe(false);
  });
});

describe("effectivePlan", () => {
  const future = new Date(Date.now() + 86_400_000);
  const past = new Date(Date.now() - 86_400_000);
  it("keeps Pro during a cancelled subscription's paid period", () => {
    expect(effectivePlan({ plan: "PRO", subscriptionStatus: "cancelled", currentPeriodEnd: future })).toBe("PRO");
  });
  it("drops to Free once a cancelled period has ended (missed webhook)", () => {
    expect(effectivePlan({ plan: "PRO", subscriptionStatus: "cancelled", currentPeriodEnd: past })).toBe("FREE");
  });
  it("respects comped Pro and Free", () => {
    expect(effectivePlan({ plan: "PRO", subscriptionStatus: null, currentPeriodEnd: null })).toBe("PRO");
    expect(effectivePlan({ plan: "FREE", subscriptionStatus: "active", currentPeriodEnd: null })).toBe("FREE");
  });
});

describe("hasLiveSubscription", () => {
  it("is true only for a renewing Lemon Squeezy subscription", () => {
    expect(hasLiveSubscription({ lsSubscriptionId: "1", subscriptionStatus: "active" })).toBe(true);
    expect(hasLiveSubscription({ lsSubscriptionId: "1", subscriptionStatus: "past_due" })).toBe(true);
    expect(hasLiveSubscription({ lsSubscriptionId: "1", subscriptionStatus: "cancelled" })).toBe(false);
    expect(hasLiveSubscription({ lsSubscriptionId: null, subscriptionStatus: null })).toBe(false);
  });
});
