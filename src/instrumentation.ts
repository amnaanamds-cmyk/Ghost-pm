import * as Sentry from "@sentry/nextjs";
import { privacySafeDataCollection } from "@/lib/sentry-options";

export async function register() {
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
