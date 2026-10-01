# Ghost PM

**The product manager for your AI coding agents.**

Dump messy ideas, bug reports, voice notes and screenshots. Ghost PM (powered by Claude) turns them into prioritized tasks, writes paste-ready prompts for Claude Code / Cursor, plans your week, and syncs with GitHub issues — for solo builders and teams.

## Features

**Core**
- **Dump anything:** one box for text, pasted or dropped screenshots, and voice (the browser's Web Speech API).
- **AI organizer:** one messy note becomes several prioritized tasks (P0–P3), each with a "why". Claude returns JSON; it's validated with zod and retried once if invalid. Screenshots are sent to Claude as images.
- **Agent prompt generator:** streams a detailed prompt for Claude Code or Cursor, covering goal, context, likely files, steps, acceptance criteria and what *not* to change. One click copies it.
- **Kanban board:** drag cards between columns, search, filter by priority or "assigned to me", add tasks by hand, and edit them inline.
- **Plan my week:** Claude picks up to 5 tasks to build now, plus what to do later and what to ignore, with a reason for each.
- **GitHub:** a repo picker, "Push to GitHub" to create an issue with the agent prompt in it, and a sync that marks tasks done when their issue closes.
- **Collaboration:** comments on tasks, capture history, and CSV/Markdown export.

**Teams & billing**
- **Workspaces:** each user gets a personal workspace and can create team workspaces, with roles (owner, admin, member).
- **Invites:** single-use invite links that expire, optionally sent by email.
- **Pro plan:** $12 per seat per month through **Lemon Squeezy** (merchant of record, so it handles sales tax and VAT). Seat count follows membership automatically, and a signed webhook keeps the plan in sync.
- **Free plan:** 20 AI-created tasks per month per workspace. Tasks you add by hand are always free.

**Trust & operations**
- **Legal pages:** Terms and Privacy, plus JSON data export and self-serve account deletion (GDPR access, portability and erasure).
- **Admin dashboard:** KPIs, MRR, comping Pro, resetting usage, and failed webhooks.
- **Security:**
  - GitHub tokens are encrypted at rest (AES-256-GCM).
  - Rate limits are stored in Postgres.
  - Headers include CSP, HSTS and frame-ancestors.
  - Screenshots live in a private bucket and are served only to workspace members.
- **Optional integrations:** Cloudflare R2 or S3 for screenshots, Resend for email (welcome, invites, weekly digest with one-click unsubscribe), and Sentry for errors with user content excluded.
- **Deployment:** a Docker image with migrations applied on start and a health check, a Vercel config with crons, and GitHub Actions CI.

Every integration is **optional**. The app runs with just Postgres, GitHub OAuth and an Anthropic key, and each feature switches on when its env vars are set.

## Stack

Next.js 15 (App Router, TypeScript) · Tailwind v4 · shadcn/ui · Prisma + Postgres · Auth.js (GitHub OAuth) · Anthropic SDK · dnd-kit · Lemon Squeezy · Resend · Sentry · S3/R2 · Vitest · Playwright

## Quick start (local)

**Prerequisites:** Node.js 22+ and Postgres 16. The easiest way to get Postgres is `docker compose up -d db`.

```bash
npm install
npm run setup    # creates .env with fresh secrets, creates and migrates the database, lists what's configured
npm run dev      # http://localhost:3000
```

`npm run setup` turns on **Dev sign-in** (`ENABLE_DEV_LOGIN=true`). You can try the whole app — workspaces, invites, the board — before you register a GitHub OAuth app. Dev sign-in never works in production builds. To use AI features, add `ANTHROPIC_API_KEY` to `.env`.

Signed-in admins (`ADMIN_EMAILS`) can see which integrations are configured under **/admin → System status**.

### Required environment variables

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | `npx auth secret` or `openssl rand -base64 32` |
| `AUTH_URL` | `http://localhost:3000` locally; your public URL in production |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth App ([create one](https://github.com/settings/developers)). Callback URL: `<AUTH_URL>/api/auth/callback/github` |
| `ANTHROPIC_API_KEY` | From the [Anthropic Console](https://console.anthropic.com) |
| `ANTHROPIC_MODEL` | For example `claude-opus-5-5` |

Everything else is optional: billing, storage, email, Sentry, legal details and admin access. `.env.example` documents every variable, and **[docs/DEPLOY.md](docs/DEPLOY.md)** walks through setting up each service.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` | Unit + integration tests (Vitest; needs Postgres, uses `ghostpm_test`) |
| `npm run test:e2e` | Playwright end-to-end tests against the production build (run `npm run build` first; uses `ghostpm_e2e` and a local mock of Claude/GitHub) |
| `npm run setup` | One-time local setup (safe to re-run; never overwrites `.env`) |
| `npm run db:migrate` / `npm run db:deploy` | Prisma migrations (dev / production) |
| `GITHUB_TEST_TOKEN=$(gh auth token) npm test -- github-live` | Optional read-only checks against the real GitHub API |

## Architecture

```
src/
  app/
    (app)/            signed-in app: dashboard, projects, settings, admin
    (legal)/          terms, privacy
    actions/          server actions — every mutation, each one auth-checked
    api/              route handlers: streaming prompts, exports, images, webhooks, crons, health
    invite/[token]/   invite accept page
  lib/
    ai.ts             Claude client: JSON generation with zod + one retry, streaming
    organize.ts       capture → tasks (respects plan limits)
    workspace.ts      membership-based access control and roles
    billing.ts        Lemon Squeezy checkout/portal/seats + webhook state machine
    limits.ts         per-workspace monthly usage
    rate-limit.ts     Postgres fixed-window rate limiter
    storage.ts        S3/R2 or Postgres screenshot storage
    email.ts          Resend + templates; digest.ts for the weekly digest
    crypto.ts         AES-256-GCM for OAuth tokens
prisma/               schema + migrations
tests/                Vitest unit & integration tests
e2e/                  Playwright tests + mock server
```

How it works:
- **Access control:** every project, task, capture and comment is reached through a workspace membership check. Roles decide admin actions: admins invite and remove people, owners manage billing and roles.
- **Plan limits:** a per-workspace monthly counter that is updated atomically and is aware of the billing period. It's checked before Claude is called, so a capped workspace costs nothing.
- **Billing state:** it comes only from signed webhooks. Out-of-order events are ignored, and `effectivePlan()` guards against a missed expiry webhook.
- **Errors:** `UserError` subclasses carry messages that are safe to show. Anything else is reported to Sentry and shown to the user as a generic message.

## Known limitations

- AI calls run inside the request; there is no job queue. A capture takes a few seconds.
- Voice input depends on browser support (Chrome, Edge and Safari; not Firefox).
- The Content-Security-Policy allows `'unsafe-inline'` scripts, because Next.js inlines its bootstrap scripts. Move to nonces if you need a stricter CSP.
