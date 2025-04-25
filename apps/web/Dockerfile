# Build de la SPA Vite (apps/web) puis service statique via Caddy.
# Build context = racine du monorepo (workspace bun + @dorloter/api-client).
#   docker build -f apps/web/Dockerfile -t dorloter-web .

# ── Stage build : compile la SPA en statique ─────────────────────────────────
FROM oven/bun:1 AS build
WORKDIR /repo

# Repo complet : le workspace bun doit correspondre a bun.lock (frozen).
COPY . .
RUN bun install --frozen-lockfile

# Variables inlinees au build par Vite. Vides par defaut : la SPA appelle
# l'API en same-origin (/api/v1) derriere le Caddy edge.
ARG VITE_API_URL=
ARG VITE_MAP_STYLE=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_MAP_STYLE=$VITE_MAP_STYLE
RUN cd apps/web && bun run build

# ── Stage runtime : Caddy sert le dist statique sur :80 (interne) ────────────
FROM caddy:2-alpine AS runtime
COPY --from=build /repo/apps/web/dist /srv
COPY apps/web/Caddyfile.static /etc/caddy/Caddyfile
EXPOSE 80
