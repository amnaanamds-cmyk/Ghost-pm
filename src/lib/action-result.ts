export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

export function actionError(error: unknown, fallback = "Something went wrong"): { ok: false; error: string } {
  // notFound()/redirect() throw special errors that must propagate.
  if (error && typeof error === "object" && "digest" in error) throw error;
  console.error(error);
  return { ok: false, error: error instanceof Error && error.message ? error.message : fallback };
}
