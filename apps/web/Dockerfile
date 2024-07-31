# syntax=docker/dockerfile:1.7
#
# Build context : racine du monorepo (cf. docker-compose.prod.yml).
# Tous les COPY référencent les chemins depuis la racine.

# ─── Étape 1 : dépendances ────────────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app

# Manifests : on copie tout ce qui définit le workspace pour que bun
# install résolve les liens entre packages.
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY packages/api-client/package.json ./packages/api-client/

RUN bun install --frozen-lockfile

# ─── Étape 2 : build Next.js ──────────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS builder
WORKDIR /app

# Tout le node_modules + tous les sources
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# S3_PUBLIC_URL doit être présent au build pour alimenter images.remotePatterns.
ARG S3_PUBLIC_URL
ENV S3_PUBLIC_URL=${S3_PUBLIC_URL}
# Idem : la clé publique VAPID est embarquée côté client.
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ARG NEXT_PUBLIC_MAPTILER_KEY
ENV NEXT_PUBLIC_MAPTILER_KEY=${NEXT_PUBLIC_MAPTILER_KEY}
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY}

# `next build` depuis apps/web — la conf next.config.ts définit
# `outputFileTracingRoot` pour que standalone embarque les workspace-deps.
WORKDIR /app/apps/web
RUN bun run build

# ─── Étape 3 : runtime minimal ────────────────────────────────────────────────
# Image Debian plutôt qu'Alpine : @tensorflow/tfjs-node (utilisé pour la
# modération NSFW) dépend de bindings natifs compilés contre glibc, pas musl.
FROM oven/bun:1.2 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# User non-root pour l'exécution
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -s /bin/bash nextjs

# Output standalone Next.js : `apps/web/.next/standalone/` contient
# server.js + node_modules ré-organisés selon la racine du workspace.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Migrations Drizzle (copiées pour pouvoir exec `bun drizzle-kit migrate`
# depuis le container en prod).
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/src/server/db/migrations ./apps/web/src/server/db/migrations
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/drizzle.config.ts ./apps/web/drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
# `node_modules` complet pour les commandes utilitaires (drizzle-kit migrate)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs
EXPOSE 3000

# Healthcheck simple : la home répond.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/ >/dev/null 2>&1 || exit 1

# Standalone server vit à apps/web/server.js avec outputFileTracingRoot.
CMD ["bun", "apps/web/server.js"]
