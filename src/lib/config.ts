/**
 * What's configured, in one place. Used for startup warnings, the admin System status panel and to
 * hide UI for features that can't work.
 */
const has = (...keys: string[]) => keys.every((k) => !!process.env[k]?.trim());
const missing = (...keys: string[]) => keys.filter((k) => !process.env[k]?.trim());

export type Integration = { id: string; name: string; required: boolean; enabled: boolean; missing: string[]; note: string };

export function integrations(): Integration[] {
  const list: [string, string, boolean, string[], string][] = [
    ["database", "Database", true, ["DATABASE_URL"], "Postgres connection"],
    ["auth", "Auth secret", true, ["AUTH_SECRET"], "Signs sessions and unsubscribe links"],
    ["github", "GitHub sign-in", true, ["AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET"], "OAuth app for sign-in and issues"],
    ["ai", "Claude", true, ["ANTHROPIC_API_KEY"], `Model: ${process.env.ANTHROPIC_MODEL || "claude-opus-5-5"}`],
    ["billing", "Lemon Squeezy billing", false, ["LEMONSQUEEZY_API_KEY", "LEMONSQUEEZY_STORE_ID", "LEMONSQUEEZY_VARIANT_ID", "LEMONSQUEEZY_WEBHOOK_SECRET"], "Pro checkout and subscriptions"],
    ["storage", "Object storage", false, ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"], "Screenshots (falls back to Postgres)"],
    ["email", "Email (Resend)", false, ["RESEND_API_KEY", "EMAIL_FROM"], "Welcome, invites, weekly digest"],
    ["cron", "Cron secret", false, ["CRON_SECRET"], "Weekly digest and seat sync jobs"],
    ["sentry", "Sentry", false, ["SENTRY_DSN"], "Error monitoring"],
    ["tokenKey", "Token encryption key", false, ["TOKEN_ENCRYPTION_KEY"], "Falls back to a key derived from AUTH_SECRET"],
    ["legal", "Legal details", false, ["NEXT_PUBLIC_LEGAL_ENTITY", "NEXT_PUBLIC_CONTACT_EMAIL", "NEXT_PUBLIC_LEGAL_JURISDICTION"], "Shown on Terms, Privacy and footer"],
  ];
  return list.map(([id, name, required, keys, note]) => ({
    id,
    name,
    required,
    enabled: has(...keys),
    missing: missing(...keys),
    note,
  }));
}

export const githubAuthConfigured = () => has("AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET");

/**
 * Local demo sign-in (no GitHub OAuth app needed). Never available in production builds,
 * regardless of env vars.
 */
export const devLoginEnabled = () =>
  process.env.NODE_ENV !== "production" && process.env.ENABLE_DEV_LOGIN === "true";
