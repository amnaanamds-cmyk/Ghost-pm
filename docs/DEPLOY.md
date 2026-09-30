# Deploying Ghost PM

Two supported paths: **Vercel + managed Postgres** (easiest) or **Docker** (any VPS, Railway, Fly.io, Render…).
The optional services — billing, storage, email, monitoring — are the same for both.

## 1. Required setup (both paths)

1. **Postgres 16+** — e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com), Railway, or your own.
   Use the pooled connection string for `DATABASE_URL` on serverless platforms.
2. **GitHub OAuth App** — <https://github.com/settings/developers> → *New OAuth App*
   - Homepage URL: `https://YOUR_DOMAIN`
   - Callback URL: `https://YOUR_DOMAIN/api/auth/callback/github`
   - Copy the client ID/secret into `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`.
3. **Secrets**
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `TOKEN_ENCRYPTION_KEY` — `openssl rand -hex 32` (encrypts GitHub tokens; if unset, derived from `AUTH_SECRET`.
     Don't change it later without re-login — existing tokens become unreadable.)
   - `CRON_SECRET` — `openssl rand -hex 32`
4. **Anthropic** — `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` (e.g. `claude-opus-5-5`).
5. `AUTH_URL` / `APP_URL` — your public URL, e.g. `https://ghostpm.example.com`.
6. `ADMIN_EMAILS` — your email or GitHub username, to access `/admin`.

## 2a. Vercel

1. Import the repo in Vercel. Framework preset: Next.js.
2. Add the environment variables (Production + Preview).
3. Build command: `npx prisma migrate deploy && npm run build` (runs migrations on each deploy).
4. Deploy. `vercel.json` registers two crons automatically:
   - `/api/cron/weekly-digest` — Mondays 08:00 UTC
   - `/api/cron/sync-seats` — nightly seat reconciliation
   Vercel sends `Authorization: Bearer $CRON_SECRET` automatically once `CRON_SECRET` is set.
5. The streaming agent-prompt route declares `maxDuration = 300`; on the Hobby plan Vercel caps functions at a lower
   limit, so use Pro for long generations.

## 2b. Docker

```bash
docker build -t ghost-pm .
docker run -d --name ghost-pm -p 3000:3000 --env-file .env ghost-pm
```

- Migrations run automatically on start (`SKIP_MIGRATIONS=1` to disable).
- Health check: `GET /api/health` (also wired as the Docker `HEALTHCHECK`).
- Runs as a non-root user; honors `PORT`.
- `NEXT_PUBLIC_*` values are inlined at build time — pass them with `--build-arg` if you use them.
- Local production-like stack with Postgres: `docker compose up --build`.
- **Crons:** call the endpoints from your scheduler (cron, GitHub Actions, Railway cron…):
  ```bash
  curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://YOUR_DOMAIN/api/cron/weekly-digest   # weekly
  curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://YOUR_DOMAIN/api/cron/sync-seats      # daily
  ```

## 3. Optional services

### Billing — Lemon Squeezy
1. Create a store and a **subscription product** with a monthly variant priced **per unit** (one unit = one seat).
2. Settings → API → create an API key → `LEMONSQUEEZY_API_KEY`. Store ID → `LEMONSQUEEZY_STORE_ID`.
   Variant ID → `LEMONSQUEEZY_VARIANT_ID`.
3. Settings → Webhooks → add `https://YOUR_DOMAIN/api/webhooks/lemonsqueezy`, choose a signing secret
   (`LEMONSQUEEZY_WEBHOOK_SECRET`) and enable all `subscription_*` events.
4. Use test mode first (`LEMONSQUEEZY_TEST_MODE=true`), buy with a test card, confirm the workspace flips to Pro in
   Settings → Billing and in `/admin`.
5. Set `PRO_PRICE_PER_SEAT` to match your price (used for display and the MRR estimate).

Billing UI stays hidden until all four `LEMONSQUEEZY_*` values are set. Failed webhook deliveries show up in `/admin`
and are retried by Lemon Squeezy (the endpoint returns 500 on processing errors).

### Screenshot storage — Cloudflare R2 (or S3 / MinIO)
Without this, screenshots are stored as base64 in Postgres (fine to start). For R2:
1. Create a bucket (keep it **private**).
2. Create an R2 API token with Object Read & Write for that bucket.
3. Set `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION=auto`,
   `S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`.
For AWS S3, leave `S3_ENDPOINT` empty and set the real region. Images are served through `/api/captures/:id/image`
after a membership check — no public bucket URLs.

### Email — Resend
1. Add and verify your sending domain in Resend.
2. `RESEND_API_KEY` and `EMAIL_FROM="Ghost PM <hello@yourdomain.com>"`.
Sends: welcome email, workspace invites (when an email is entered), weekly digest (opt-out in Settings → Account and
one-click unsubscribe).

### Error monitoring — Sentry
- `SENTRY_DSN` (server) and `NEXT_PUBLIC_SENTRY_DSN` (browser; build-time).
- For readable stack traces, also set `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` at build time to upload
  source maps.
Request bodies, cookies, query strings, AI inputs/outputs and DB query data are excluded from events.

### Legal pages
Set `NEXT_PUBLIC_LEGAL_ENTITY`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_LEGAL_JURISDICTION`. The Terms and Privacy
pages are a starting point that matches how this app handles data — **have a lawyer review them** before launch,
especially if you sell to the EU/UK or process sensitive data.

## 4. Launch checklist

- [ ] `AUTH_URL` is the HTTPS production URL and the GitHub OAuth callback matches it
- [ ] `TOKEN_ENCRYPTION_KEY`, `AUTH_SECRET`, `CRON_SECRET` set to strong random values
- [ ] `/api/health` returns `{"ok":true}`
- [ ] Sign in, create a project, capture something, generate a prompt, push an issue
- [ ] Lemon Squeezy test purchase → workspace shows Pro; cancel → stays Pro until period end
- [ ] Invite email arrives; digest cron returns `{"ok":true,...}`
- [ ] Sentry receives a test error
- [ ] Terms/Privacy reviewed; contact email monitored
- [ ] Database backups enabled at your Postgres provider
