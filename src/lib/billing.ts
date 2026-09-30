import "server-only";
import { UserError } from "@/lib/action-result";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  createCheckout,
  getSubscription,
  lemonSqueezySetup,
  updateSubscriptionItem,
} from "@lemonsqueezy/lemonsqueezy.js";
import type { Plan, Workspace } from "@prisma/client";
import { db } from "@/lib/db";

export const PRO_PRICE_PER_SEAT = Number(process.env.PRO_PRICE_PER_SEAT) || 12;

const env = () => ({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
  storeId: process.env.LEMONSQUEEZY_STORE_ID,
  variantId: process.env.LEMONSQUEEZY_VARIANT_ID,
  webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
});

export class BillingError extends UserError {}

export const billingEnabled = () => {
  const e = env();
  return Boolean(e.apiKey && e.storeId && e.variantId && e.webhookSecret);
};

let configured = false;
function client() {
  const { apiKey } = env();
  if (!billingEnabled() || !apiKey) throw new BillingError("Billing isn't configured on this server yet.");
  if (!configured) {
    lemonSqueezySetup({ apiKey, onError: (e) => console.error("Lemon Squeezy error", e.message, e.cause) });
    configured = true;
  }
  return env() as { [K in keyof ReturnType<typeof env>]: string };
}

// ---------- Plan state ----------

/** Statuses that grant Pro. `cancelled` keeps Pro until the paid period ends. */
const PRO_STATUSES = new Set(["on_trial", "active", "past_due", "cancelled"]);

/** Plan to enforce right now (guards against a missed `expired` webhook). */
export function effectivePlan(ws: Pick<Workspace, "plan" | "subscriptionStatus" | "currentPeriodEnd">): Plan {
  if (ws.plan !== "PRO") return "FREE";
  if (ws.subscriptionStatus === "cancelled" && ws.currentPeriodEnd && ws.currentPeriodEnd < new Date()) return "FREE";
  return "PRO";
}

/** A paid Lemon Squeezy subscription that will keep renewing (must be cancelled before deleting). */
export function hasLiveSubscription(ws: Pick<Workspace, "lsSubscriptionId" | "subscriptionStatus">) {
  return Boolean(ws.lsSubscriptionId) && !["cancelled", "expired"].includes(ws.subscriptionStatus ?? "");
}

export const seatCount = (workspaceId: string) => db.membership.count({ where: { workspaceId } });

// ---------- Checkout & portal ----------

export async function createProCheckout(opts: {
  workspace: Workspace;
  email?: string | null;
  name?: string | null;
  redirectUrl: string;
}) {
  const { storeId, variantId } = client();
  const seats = await seatCount(opts.workspace.id);
  const res = await createCheckout(storeId, variantId, {
    checkoutData: {
      email: opts.email ?? undefined,
      name: opts.name ?? undefined,
      // Echoed back on every subscription webhook as meta.custom_data.
      custom: { workspace_id: opts.workspace.id },
      variantQuantities: [{ variantId: Number(variantId), quantity: seats }],
    },
    productOptions: {
      name: `Ghost PM Pro — ${opts.workspace.name}`,
      redirectUrl: opts.redirectUrl,
      enabledVariants: [Number(variantId)],
    },
    checkoutOptions: { embed: false },
    testMode: process.env.LEMONSQUEEZY_TEST_MODE === "true" || undefined,
  });
  if (res.error) throw new BillingError("Couldn't start checkout — please try again.");
  return res.data.data.attributes.url;
}

/** Signed customer-portal URL (valid 24h), fetched fresh each time. */
export async function customerPortalUrl(subscriptionId: string) {
  client();
  const res = await getSubscription(subscriptionId);
  if (res.error) throw new BillingError("Couldn't open the billing portal — please try again.");
  return res.data.data.attributes.urls.customer_portal;
}

/** Keeps the subscription quantity equal to the member count (called after joins/removals). */
export async function syncSeats(workspaceId: string) {
  const ws = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!ws?.lsSubscriptionItemId || effectivePlan(ws) !== "PRO" || !billingEnabled()) return;
  const seats = await seatCount(workspaceId);
  if (seats === ws.seats) return;
  client();
  const res = await updateSubscriptionItem(ws.lsSubscriptionItemId, { quantity: seats });
  if (res.error) {
    console.error("Seat sync failed", workspaceId, res.error.message);
    return; // Non-fatal: next membership change or the nightly job retries.
  }
  await db.workspace.update({ where: { id: workspaceId }, data: { seats } });
}

// ---------- Webhooks ----------

/** Lemon Squeezy signs the raw body with HMAC-SHA256 (hex) in the X-Signature header. */
export function verifySignature(rawBody: string, signature: string | null) {
  const { webhookSecret } = env();
  if (!webhookSecret || !signature) return false;
  const expected = Buffer.from(createHmac("sha256", webhookSecret).update(rawBody).digest("hex"), "utf8");
  const given = Buffer.from(signature, "utf8");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

type SubscriptionPayload = {
  meta: { event_name: string; custom_data?: { workspace_id?: string } };
  data: {
    type: string;
    id: string;
    attributes: {
      customer_id: number;
      status: string;
      renews_at: string | null;
      ends_at: string | null;
      updated_at: string;
      first_subscription_item: { id: number; quantity: number } | null;
    };
  };
};

/** Applies a subscription webhook to the workspace. Idempotent and ignores out-of-order events. */
export async function handleSubscriptionEvent(payload: SubscriptionPayload) {
  const { meta, data } = payload;
  if (data.type !== "subscriptions") return "ignored: not a subscription";
  const a = data.attributes;

  const ws =
    (await db.workspace.findUnique({ where: { lsSubscriptionId: String(data.id) } })) ??
    (meta.custom_data?.workspace_id
      ? await db.workspace.findUnique({ where: { id: meta.custom_data.workspace_id } })
      : null);
  if (!ws) return "ignored: unknown workspace";

  const updatedAt = new Date(a.updated_at);
  if (ws.billingUpdatedAt && updatedAt < ws.billingUpdatedAt) return "ignored: stale event";

  const periodEnd = a.status === "cancelled" || a.status === "expired" ? a.ends_at : a.renews_at;
  await db.workspace.update({
    where: { id: ws.id },
    data: {
      plan: PRO_STATUSES.has(a.status) ? "PRO" : "FREE",
      subscriptionStatus: a.status,
      lsSubscriptionId: String(data.id),
      lsCustomerId: String(a.customer_id),
      lsSubscriptionItemId: a.first_subscription_item ? String(a.first_subscription_item.id) : ws.lsSubscriptionItemId,
      seats: a.first_subscription_item?.quantity ?? ws.seats,
      currentPeriodEnd: periodEnd ? new Date(periodEnd) : null,
      billingUpdatedAt: updatedAt,
    },
  });
  return `applied: ${meta.event_name} → ${a.status}`;
}
