# Build de la SPA espace pro (apps/pro) puis service statique via Caddy.
# Build context = racine du monorepo (workspace bun).
#   docker build -f apps/pro/Dockerfile -t dorloter-pro .

# ── Stage build : compile la SPA en statique ─────────────────────────────────
FROM oven/bun:1 AS build
WORKDIR /repo

# Repo complet : le workspace bun doit correspondre a bun.lock (frozen).
COPY . .
RUN bun install --frozen-lockfile

# Variable inlinee au build par Vite. Vide par defaut : la SPA appelle
# l'API en same-origin (/api/v1) derriere le Caddy edge.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN cd apps/pro && bun run build

# ── Stage runtime : Caddy sert le dist statique sur :80 (interne) ────────────
FROM caddy:2-alpine AS runtime
COPY --from=build /repo/apps/pro/dist /srv
COPY apps/pro/Caddyfile.static /etc/caddy/Caddyfile
EXPOSE 80
