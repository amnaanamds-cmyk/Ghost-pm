import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { getIssueState, GitHubError, listRepos } from "@/lib/github";
import { makeUser, resetDb } from "../setup/db";

/**
 * Read-only checks against the real GitHub API — nothing is created or modified.
 *
 *   GITHUB_TEST_TOKEN=$(gh auth token) npm test -- github-live
 *
 * Optional:
 *   GITHUB_TEST_REPO=owner/repo          repo the token can read (default facebook/react)
 *   GITHUB_TEST_CLOSED_ISSUE=<url>       a closed issue (default facebook/react#1)
 *   GITHUB_TEST_REPO_SCOPED=1            token can only reach GITHUB_TEST_REPO (skips account-wide checks)
 */
const token = process.env.GITHUB_TEST_TOKEN;
const repo = process.env.GITHUB_TEST_REPO ?? "facebook/react";
const closedIssue = process.env.GITHUB_TEST_CLOSED_ISSUE ?? (process.env.GITHUB_TEST_REPO ? undefined : "https://github.com/facebook/react/issues/1");
const scoped = process.env.GITHUB_TEST_REPO_SCOPED === "1";

describe.skipIf(!token)("GitHub API (live, read-only)", () => {
  let userId: string;

  beforeAll(async () => {
    delete process.env.GITHUB_API_URL; // always hit api.github.com here
    await resetDb();
    const u = await makeUser("Live");
    await db.account.create({
      data: { userId: u.id, type: "oauth", provider: "github", providerAccountId: "live", access_token: encryptSecret(token) },
    });
    userId = u.id;
  });

  it("authenticates with the decrypted token and treats a missing issue as unknown", async () => {
    expect(await getIssueState(userId, `https://github.com/${repo}/issues/999999999`)).toBeNull();
  });

  it.skipIf(!closedIssue)("reads the state of a real closed issue", async () => {
    expect(await getIssueState(userId, closedIssue!)).toBe("closed");
  });

  it.skipIf(scoped)("lists repos in the expected shape", async () => {
    const repos = await listRepos(userId);
    expect(Array.isArray(repos)).toBe(true);
    for (const r of repos) expect(r.fullName).toMatch(/^[\w.-]+\/[\w.-]+$/);
  });

  it.skipIf(scoped)("turns a revoked token into a clear sign-in-again error", async () => {
    const bad = await makeUser("Bad");
    await db.account.create({
      data: { userId: bad.id, type: "oauth", provider: "github", providerAccountId: "bad", access_token: encryptSecret("gho_revoked") },
    });
    await expect(listRepos(bad.id)).rejects.toThrow(GitHubError);
    await expect(listRepos(bad.id)).rejects.toThrow(/sign in again/);
  });
});
