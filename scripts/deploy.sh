#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Miaou — script de déploiement exécuté sur le VPS (par GitHub Actions via SSH
# ou manuellement).
#
# Préconditions (à satisfaire une seule fois au setup initial) :
#   - Docker + docker compose plugin v2 installés
#   - /opt/miaou contient un clone git du repo
#   - /opt/miaou/.env.production rempli (voir docs/ENV.md)
#   - Rôles PG créés (via bun prod:init-roles)
#
# Idempotent : peut être relancé autant de fois que nécessaire, garanti
# non-destructif sauf défaillance du build.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

if [[ ! -f .env.production ]]; then
  echo "❌ .env.production introuvable — setup initial pas terminé" >&2
  exit 1
fi

export COMPOSE_PROJECT_NAME=miaou-prod
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"

echo "📦 Build image app (sur le VPS)…"
$COMPOSE build app

echo "🗄  Services d'infra up (postgres + minio)…"
$COMPOSE up -d postgres minio

# Attente que PG réponde
echo "⏳ Attente de Postgres…"
for i in {1..30}; do
  if $COMPOSE exec -T postgres pg_isready -U "${POSTGRES_SUPERUSER:-miaou}" -d miaou > /dev/null 2>&1; then
    echo "   → prêt"
    break
  fi
  sleep 1
  if [[ $i -eq 30 ]]; then
    echo "❌ Postgres n'a pas démarré en 30s" >&2
    exit 1
  fi
done

echo "🔄 Migrations Drizzle…"
# `run --rm` lance un container éphémère avec la nouvelle image — ne touche
# pas au container app courant tant que la migration n'a pas abouti.
$COMPOSE run --rm \
  -e DATABASE_URL="${DATABASE_URL_MIGRATIONS:-$DATABASE_URL}" \
  app bun x drizzle-kit migrate

echo "🔐 Grants PG (si nouvelle colonne a été ajoutée)…"
./scripts/prod-init-roles.sh

echo "🚀 Recreate app + caddy avec la nouvelle image…"
$COMPOSE up -d --force-recreate --no-deps app caddy

echo "🧹 Nettoyage des images Docker orphelines…"
docker image prune -f --filter "until=168h" > /dev/null || true

echo "✅ Déploiement terminé — $(date -Iseconds)"
echo "   Healthcheck : $(curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN}/api/health || echo unreachable)"
