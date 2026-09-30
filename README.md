# Ghost PM

**The product manager for your AI coding agents.**

Dump messy ideas, bug reports, voice notes and screenshots. Ghost PM (powered by Claude) turns them into prioritized tasks, writes paste-ready prompts for Claude Code / Cursor, plans your week, and pushes tasks to GitHub issues.

## Features

- **Dump anything:** one box for text, pasted or uploaded screenshots, and voice-to-text (browser Web Speech API, free).
- **AI organizer:** each capture becomes one or more tasks, each with a title, a "why" and a priority from P0 to P3.
- **Agent prompt generator:** a detailed prompt for each task covering the goal, context, likely files, steps, acceptance criteria and what *not* to change, with one-click copy.
- **Kanban board:** columns for todo, doing and done. You can drag cards between columns and filter by priority.
- **GitHub sync:** creates an issue from a task, with the "why" and the agent prompt in the body. It uses the token from your GitHub login.
- **Plan my week:** Claude sorts open tasks into three buckets: build this week (max 5), later, and ignore. Each task gets a one-line reason.
- **Plans:** the Free plan allows 20 AI-created tasks per month. Pro ($12/mo) is UI only; there are no payments yet.

## Stack

Next.js 15 (App Router, TypeScript) · Tailwind v4 · shadcn/ui · Prisma + Postgres · Auth.js (GitHub OAuth) · Anthropic SDK · dnd-kit

## Setup

### 1. Prerequisites

- Node.js 20+
- A Postgres database. For example, run one locally with Docker:
  ```bash
  docker run -d --name ghostpm-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ghostpm -p 5432:5432 postgres:16
  ```

### 2. Install

```bash
npm install          # also runs `prisma generate`
cp .env.example .env
```

### 3. Configure `.env`

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | Random secret. Generate one with `npx auth secret` or `openssl rand -base64 32` |
| `AUTH_URL` | Public URL of the app (`http://localhost:3000` in dev) |
| `AUTH_TRUST_HOST` | `true` (needed behind proxies / on most hosts) |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth App credentials (see below) |
| `ANTHROPIC_API_KEY` | Your Anthropic API key: https://console.anthropic.com |
| `ANTHROPIC_MODEL` | Claude model ID, e.g. `claude-opus-5-5` |
| `FREE_TASKS_PER_MONTH` | Free-plan monthly task limit (default `20`) |
| `GITHUB_API_URL` | *Optional.* Set this only for GitHub Enterprise Server |

**GitHub OAuth App:** go to https://github.com/settings/developers and choose **New OAuth App**:
- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

Copy the Client ID and a newly generated Client Secret into `.env`. The app requests the `repo` scope so it can create issues on your private repos.

### 4. Create the database tables

```bash
npm run db:migrate    # dev: applies migrations (prisma migrate dev)
# production: npm run db:deploy
```

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000 and sign in with GitHub.

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run db:migrate` / `npm run db:deploy` | Prisma migrations (dev / prod) |

## How it works

- **Server actions** (`src/app/actions/*`) handle every mutation. They check ownership on every call.
- **AI** (`src/lib/ai.ts`): Claude is asked for JSON only. Replies are validated with zod. If a reply is invalid, Claude is retried once and shown its own reply plus the validation error. Screenshots are sent as base64 image blocks.
- **Captures are always saved,** even if the AI call fails. A capture with no tasks shows an **Organize** button so you can retry.
- **Plan limits** (`src/lib/limits.ts`): a monthly counter on each user. Deleting tasks does not refund quota. The limit is checked *before* calling Claude, so users who are over the cap cost nothing.
- **Screenshots** are downscaled in the browser (max 1568px) and stored as base64 data URLs in Postgres. This keeps v1 simple; move them to object storage later.
- **Voice** uses the browser's Web Speech API. It works in Chrome, Edge and Safari; in other browsers the mic button is disabled.

## Known limitations (v1)

- There are no payments. Upgrade users by hand with `UPDATE "User" SET plan = 'PRO' WHERE email = '...';`
- AI calls run inside the request (no queue), so a capture takes a few seconds while Claude thinks.
- If you revoke the GitHub token, sign out and back in to refresh it.
