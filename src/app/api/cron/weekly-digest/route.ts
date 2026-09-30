import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { sendWeeklyDigests } from "@/lib/digest";
import { appUrl } from "@/lib/url";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await sendWeeklyDigests(await appUrl());
  return NextResponse.json({ ok: true, ...result });
}
