import "server-only";
import { headers } from "next/headers";

/** Absolute base URL of the app, for links in emails, invites and billing redirects. */
export async function appUrl() {
  const configured = process.env.APP_URL || process.env.AUTH_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
