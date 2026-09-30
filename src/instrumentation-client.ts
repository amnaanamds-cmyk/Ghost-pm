import * as Sentry from "@sentry/nextjs";
import { privacySafeDataCollection } from "@/lib/sentry-options";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    dataCollection: privacySafeDataCollection,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
