import * as Sentry from "@sentry/nextjs";
import { ZodError } from "zod";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

/** Errors whose message is safe and meant to be shown to the user (not reported to Sentry). */
export class UserError extends Error {}

export function actionError(error: unknown, fallback = "Something went wrong"): { ok: false; error: string } {
  // notFound()/redirect() throw special errors that must propagate.
  if (error && typeof error === "object" && "digest" in error) throw error;
  if (error instanceof ZodError) return { ok: false, error: error.issues[0]?.message ?? "Invalid input" };
  if (error instanceof UserError) return { ok: false, error: error.message };
  // Unexpected: report it, and don't leak internals (e.g. database errors) to the client.
  console.error(error);
  Sentry.captureException(error);
  return { ok: false, error: fallback };
}
