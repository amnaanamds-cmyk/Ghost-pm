#!/usr/bin/env node
// One-command local setup: `npm run setup`
// - creates .env from .env.example with fresh secrets (never overwrites an existing .env)
// - checks Postgres, applies migrations (creating the database if needed)
// - reports which features are configured
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ok = (m) => console.log(`\x1b[32m✔\x1b[0m ${m}`);
const warn = (m) => console.log(`\x1b[33m!\x1b[0m ${m}`);
const fail = (m) => {
  console.error(`\x1b[31m✖\x1b[0m ${m}`);
  process.exit(1);
};

const [major] = process.versions.node.split(".").map(Number);
if (major < 20) fail(`Node ${process.versions.node} is too old — install Node 22+.`);
ok(`Node ${process.versions.node}`);

if (!existsSync(".env")) {
  let env = readFileSync(".env.example", "utf8");
  const set = (key, value) => {
    const re = new RegExp(`^#?\\s*${key}=.*$`, "m");
    env = re.test(env) ? env.replace(re, `${key}="${value}"`) : `${env}\n${key}="${value}"\n`;
  };
  set("AUTH_SECRET", randomBytes(32).toString("base64"));
  set("TOKEN_ENCRYPTION_KEY", randomBytes(32).toString("hex"));
  set("CRON_SECRET", randomBytes(32).toString("hex"));
  set("ENABLE_DEV_LOGIN", "true");
  writeFileSync(".env", env);
  ok("Created .env with fresh secrets (dev sign-in enabled for local use)");
} else {
  ok(".env already exists — leaving it untouched");
}

// Minimal .env parser (Next/Prisma load it themselves at runtime).
for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
}

if (!process.env.DATABASE_URL) fail("DATABASE_URL is empty in .env");
try {
  execSync("npx prisma migrate deploy", { stdio: "pipe" });
  ok("Database migrated");
} catch (e) {
  const out = String(e.stdout || "") + String(e.stderr || "");
  fail(
    `Couldn't reach Postgres at DATABASE_URL.\n  Start one with:  docker compose up -d db\n\n${out.split("\n").filter(Boolean).slice(-4).join("\n")}`
  );
}

const missing = (...keys) => keys.filter((k) => !process.env[k]);
const checks = [
  ["Claude (required for AI)", ["ANTHROPIC_API_KEY"]],
  ["GitHub sign-in & issues", ["AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET"]],
  ["Billing (Lemon Squeezy)", ["LEMONSQUEEZY_API_KEY", "LEMONSQUEEZY_STORE_ID", "LEMONSQUEEZY_VARIANT_ID", "LEMONSQUEEZY_WEBHOOK_SECRET"]],
  ["Email (Resend)", ["RESEND_API_KEY", "EMAIL_FROM"]],
  ["Screenshot storage (S3/R2)", ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]],
  ["Error monitoring (Sentry)", ["SENTRY_DSN"]],
];
console.log("\nFeatures:");
for (const [name, keys] of checks) {
  const m = missing(...keys);
  if (m.length === 0) ok(name);
  else warn(`${name} — set ${m.join(", ")} in .env`);
}

console.log(`\nNext: \x1b[1mnpm run dev\x1b[0m and open http://localhost:3000`);
if (process.env.ENABLE_DEV_LOGIN === "true") {
  console.log("Use \"Dev sign-in\" on the home page to try it without a GitHub OAuth app.");
}
