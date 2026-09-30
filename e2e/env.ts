export const E2E_PORT = Number(process.env.E2E_PORT || 3100);
export const BASE_URL = `http://localhost:${E2E_PORT}`;
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/ghostpm_e2e?schema=public";

export const USERS = {
  owner: { id: "e2e_owner", name: "Olive Owner", email: "olive@e2e.test", githubLogin: "olive", session: "e2e-session-owner" },
  teammate: { id: "e2e_mate", name: "Tom Mate", email: "tom@e2e.test", githubLogin: "tom", session: "e2e-session-mate" },
} as const;
