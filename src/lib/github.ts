import "server-only";
import { UserError } from "@/lib/action-result";
import { db } from "@/lib/db";

const API = process.env.GITHUB_API_URL || "https://api.github.com";

export class GitHubError extends UserError {}

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

async function gh<T>(userId: string, path: string): Promise<T> {
  const token = await getToken(userId);
  const res = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ghost-pm",
    },
    cache: "no-store",
  });
  if (res.status === 401) throw new GitHubError("GitHub token expired or revoked — sign out and sign in again.");
  if (!res.ok) throw new GitHubError(`GitHub API error ${res.status}.`);
  return res.json() as Promise<T>;
}

export type RepoSummary = { fullName: string; private: boolean; description: string | null };

/** Repos the user can push to (and so create issues in), most recently updated first. */
export async function listRepos(userId: string): Promise<RepoSummary[]> {
  const repos = await gh<
    { full_name: string; private: boolean; description: string | null; has_issues: boolean; permissions?: { push?: boolean } }[]
  >(userId, "/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member");
  return repos
    .filter((r) => r.has_issues && r.permissions?.push !== false)
    .map((r) => ({ fullName: r.full_name, private: r.private, description: r.description }));
}

/** "open" | "closed" | null (unknown / not an issue URL / no access). */
export async function getIssueState(userId: string, issueUrl: string): Promise<"open" | "closed" | null> {
  const m = issueUrl.match(/github\.com\/([\w.-]+\/[\w.-]+)\/issues\/(\d+)/);
  if (!m) return null;
  try {
    const issue = await gh<{ state: "open" | "closed" }>(userId, `/repos/${m[1]}/issues/${m[2]}`);
    return issue.state;
  } catch (e) {
    if (e instanceof GitHubError && e.message.includes("token")) throw e;
    return null;
  }
}
