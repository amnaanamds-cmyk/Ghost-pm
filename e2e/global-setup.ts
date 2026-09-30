import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { E2E_DATABASE_URL, USERS } from "./env";

/** Fresh schema + two signed-in users (sessions inserted directly; no GitHub OAuth in tests). */
export default async function globalSetup() {
  execSync("npx prisma migrate reset --force --skip-generate --skip-seed", {
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL, PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "e2e test database" },
    stdio: "pipe",
  });
  const db = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  for (const u of Object.values(USERS)) {
    await db.user.create({
      data: {
        id: u.id,
        name: u.name,
        email: u.email,
        githubLogin: u.githubLogin,
        accounts: { create: { type: "oauth", provider: "github", providerAccountId: u.id, access_token: "gho_e2e" } },
        sessions: { create: { sessionToken: u.session, expires: new Date(Date.now() + 86_400_000) } },
        memberships: { create: { role: "OWNER", workspace: { create: { name: `${u.name}'s workspace`, personal: true } } } },
      },
    });
  }
  await db.$disconnect();
}
