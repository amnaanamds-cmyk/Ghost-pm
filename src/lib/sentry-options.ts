/**
 * Captures, screenshots and prompts are user content, and URLs can carry tokens (unsubscribe,
 * invites) — keep all of it out of error reports.
 */
import type { BrowserOptions } from "@sentry/nextjs";

export const privacySafeDataCollection: NonNullable<BrowserOptions["dataCollection"]> = {
  userInfo: false,
  cookies: false,
  httpBodies: [],
  urlQueryParams: false,
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  stackFrameVariables: false,
};
