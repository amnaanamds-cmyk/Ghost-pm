import * as Sentry from "@sentry/nextjs";
import { privacySafeDataCollection } from "@/lib/sentry-options";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { integrations } = await import("@/lib/config");
    for (const i of integrations()) {
      if (!i.enabled && i.required) console.warn(`[ghost-pm] ${i.name} is not configured — missing ${i.missing.join(", ")}`);
    }
  }
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    dataCollection: privacySafeDataCollection,
  });
}

export const onRequestError = Sentry.captureRequestError;
