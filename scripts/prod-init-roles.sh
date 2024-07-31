#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Miaou — création/rotation des rôles Postgres en prod.
#
# À exécuter :
#   - une fois après le premier `prod:up`
#   - après chaque migration qui ajoute une colonne à users / shelters
#     (pour que les grants column-level couvrent les nouvelles colonnes)
#   - si vous rotatez MIAOU_APP_PASSWORD / MIAOU_ADMIN_PASSWORD
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

: "${MIAOU_APP_PASSWORD:?MIAOU_APP_PASSWORD manquant dans .env.production}"
: "${MIAOU_ADMIN_PASSWORD:?MIAOU_ADMIN_PASSWORD manquant dans .env.production}"

export COMPOSE_PROJECT_NAME=miaou-prod
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"
PG_USER="${POSTGRES_SUPERUSER:-miaou}"

echo "🔐 Application des grants (scripts/init-db-roles.sql)…"
$COMPOSE exec -T postgres psql -U "$PG_USER" -d miaou < scripts/init-db-roles.sql

echo "🔑 Rotation des mots de passe miaou_app / miaou_admin…"
$COMPOSE exec -T postgres psql -U "$PG_USER" -d miaou <<SQL
ALTER ROLE miaou_app WITH PASSWORD '${MIAOU_APP_PASSWORD}';
ALTER ROLE miaou_admin WITH PASSWORD '${MIAOU_ADMIN_PASSWORD}';
SQL

echo "✅ Rôles prêts"
