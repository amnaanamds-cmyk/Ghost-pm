import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleSubscriptionEvent, verifySignature } from "@/lib/billing";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const eventName: string = payload?.meta?.event_name ?? "unknown";
  const event = await db.webhookEvent.create({ data: { provider: "lemonsqueezy", eventName, payload } });

  try {
    const result = eventName.startsWith("subscription_") ? await handleSubscriptionEvent(payload) : "ignored";
    await db.webhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("Webhook processing failed", e);
    await db.webhookEvent.update({ where: { id: event.id }, data: { error: String(e) } });
    // 500 makes Lemon Squeezy retry.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
