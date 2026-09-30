import { db } from "@/lib/db";
import { verifyUnsubscribe } from "@/lib/email";

async function unsubscribe(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("u") ?? "";
  const token = url.searchParams.get("t") ?? "";
  if (!userId || !verifyUnsubscribe(userId, token)) return false;
  await db.user.updateMany({ where: { id: userId }, data: { emailDigest: false } });
  return true;
}

const page = (ok: boolean) =>
  new Response(
    `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ghost PM</title>
<body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0">
<div style="text-align:center;max-width:360px;padding:16px"><p style="font-size:32px;margin:0">👻</p>
<h1 style="font-size:18px">${ok ? "You're unsubscribed" : "Invalid link"}</h1>
<p style="color:#737373;font-size:14px">${ok ? "You won't get the weekly digest anymore. You can turn it back on in Settings → Account." : "This unsubscribe link isn't valid."}</p>
<a href="/dashboard" style="font-size:14px">Back to Ghost PM</a></div></body>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );

/** Link in the email footer. */
export async function GET(req: Request) {
  return page(await unsubscribe(req));
}

/** RFC 8058 one-click unsubscribe from mail clients. */
export async function POST(req: Request) {
  return (await unsubscribe(req)) ? new Response(null, { status: 204 }) : new Response(null, { status: 400 });
}
