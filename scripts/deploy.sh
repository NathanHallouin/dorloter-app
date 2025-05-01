#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Dorloter — script de déploiement exécuté sur le VPS (par GitHub Actions via SSH
# ou manuellement).
#
# Préconditions (à satisfaire une seule fois au setup initial) :
#   - Docker + docker compose plugin v2 installés
#   - /opt/dorloter contient un clone git du repo
#   - /opt/dorloter/.env.production rempli (voir docs/ENV.md)
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

export COMPOSE_PROJECT_NAME=dorloter-prod
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"

echo "📦 Build images web (SPA Vite) + api  (sur le VPS)…"
$COMPOSE build web api

echo "🗄  Services d'infra up (postgres + minio)…"
$COMPOSE up -d postgres minio

# Attente que PG réponde
echo "⏳ Attente de Postgres…"
for i in {1..30}; do
  if $COMPOSE exec -T postgres pg_isready -U "${POSTGRES_SUPERUSER:-dorloter}" -d dorloter > /dev/null 2>&1; then
    echo "   → prêt"
    break
  fi
  sleep 1
  if [[ $i -eq 30 ]]; then
    echo "❌ Postgres n'a pas démarré en 30s" >&2
    exit 1
  fi
done

echo "🔐 Grants PG (rôles dorloter_app / dorloter_admin)…"
./scripts/prod-init-roles.sh

# Les migrations de schéma sont appliquées par l'API au démarrage
# (DatabaseMigrator, fichiers .sql embarqués) via le rôle DDL
# ConnectionStrings__Migrations. Pas d'étape de migration séparée ici.
echo "🚀 Recreate web + api + caddy avec les nouvelles images…"
$COMPOSE up -d --force-recreate --no-deps web api caddy

echo "🧹 Nettoyage des images Docker orphelines…"
docker image prune -f --filter "until=168h" > /dev/null || true

echo "✅ Déploiement terminé — $(date -Iseconds)"
echo "   Healthcheck : $(curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN}/api/v1/health || echo unreachable)"
