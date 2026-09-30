# syntax=docker/dockerfile:1.7
# Production image: standalone Next.js server + Prisma migrations on start.

ARG BASE_IMAGE=node:22-bookworm-slim
FROM ${BASE_IMAGE} AS base
# Prisma needs OpenSSL (not included in the slim image).
RUN command -v openssl >/dev/null || \
    (apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*)
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
# Public (NEXT_PUBLIC_*) values are inlined at build time; pass them as build args if you use them.
ARG NEXT_PUBLIC_SENTRY_DSN=""
ARG NEXT_PUBLIC_LEGAL_ENTITY=""
ARG NEXT_PUBLIC_CONTACT_EMAIL=""
ARG NEXT_PUBLIC_LEGAL_JURISDICTION=""
RUN npx prisma generate && npm run build

FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# Prisma CLI (same version as the app) for `migrate deploy` at startup.
RUN npm install -g prisma@6.19.3 && npm cache clean --force
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/prisma ./prisma
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
