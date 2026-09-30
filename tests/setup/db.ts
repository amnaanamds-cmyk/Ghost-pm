import { db } from "@/lib/db";

/** Wipes all app tables (fast, FK-safe). */
export async function resetDb() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
}

let n = 0;
export async function makeUser(name = "User") {
  n++;
  return db.user.create({ data: { name: `${name} ${n}`, email: `u${n}-${Date.now()}@test.dev`, githubLogin: `u${n}` } });
}

export async function makeWorkspace(ownerId: string, extra: Record<string, unknown> = {}) {
  return db.workspace.create({
    data: { name: "WS", members: { create: { userId: ownerId, role: "OWNER" } }, ...extra },
  });
}
