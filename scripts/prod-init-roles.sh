#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Dorloter — création/rotation des rôles Postgres en prod.
#
# À exécuter :
#   - une fois après le premier `prod:up`
#   - après chaque migration qui ajoute une colonne à users / shelters
#     (pour que les grants column-level couvrent les nouvelles colonnes)
#   - si vous rotatez DORLOTER_APP_PASSWORD / DORLOTER_ADMIN_PASSWORD
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

if [[ ! -f .env.production ]]; then
  echo "❌ .env.production introuvable" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.production
set +a

: "${DORLOTER_APP_PASSWORD:?DORLOTER_APP_PASSWORD manquant dans .env.production}"
: "${DORLOTER_ADMIN_PASSWORD:?DORLOTER_ADMIN_PASSWORD manquant dans .env.production}"

export COMPOSE_PROJECT_NAME=dorloter-prod
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"
PG_USER="${POSTGRES_SUPERUSER:-dorloter}"

echo "🔐 Application des grants (scripts/init-db-roles.sql)…"
$COMPOSE exec -T postgres psql -U "$PG_USER" -d dorloter < scripts/init-db-roles.sql

echo "🔑 Rotation des mots de passe dorloter_app / dorloter_admin…"
$COMPOSE exec -T postgres psql -U "$PG_USER" -d dorloter <<SQL
ALTER ROLE dorloter_app WITH PASSWORD '${DORLOTER_APP_PASSWORD}';
ALTER ROLE dorloter_admin WITH PASSWORD '${DORLOTER_ADMIN_PASSWORD}';
SQL

echo "✅ Rôles prêts"
