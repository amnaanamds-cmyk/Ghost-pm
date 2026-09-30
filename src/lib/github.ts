import "server-only";
import { db } from "@/lib/db";

const API = process.env.GITHUB_API_URL || "https://api.github.com";

export class GitHubError extends Error {}

async function getToken(userId: string) {
  const account = await db.account.findFirst({
    where: { userId, provider: "github" },
    select: { access_token: true },
  });
  if (!account?.access_token) throw new GitHubError("No GitHub token on file — sign out and sign in again.");
  return account.access_token;
}

export async function createIssue(userId: string, repo: string, issue: { title: string; body: string }) {
  const token = await getToken(userId);
  const res = await fetch(`${API}/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "ghost-pm",
    },
    body: JSON.stringify(issue),
    cache: "no-store",
  });

  if (res.ok) {
    const json = (await res.json()) as { html_url: string };
    return json.html_url;
  }
  const detail = await res.text().catch(() => "");
  console.error("GitHub issue create failed", res.status, detail);
  switch (res.status) {
    case 401:
      throw new GitHubError("GitHub token expired or revoked — sign out and sign in again.");
    case 403:
      throw new GitHubError(`No permission to create issues in ${repo} (or rate limited).`);
    case 404:
      throw new GitHubError(`Repo ${repo} not found, or your GitHub account can't access it.`);
    case 410:
      throw new GitHubError(`Issues are disabled on ${repo}.`);
    default:
      throw new GitHubError(`GitHub API error ${res.status}.`);
  }
}
