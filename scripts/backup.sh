#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Dorloter — backup quotidien Postgres + MinIO vers un bucket S3-compatible
#
# Destinataire par défaut : OVH Object Storage (standard) ou Cold Archive.
# Fonctionne aussi avec Scaleway, Backblaze B2, R2 ou tout autre endpoint S3.
#
# Exécution manuelle :
#   ./scripts/backup.sh
#
# Cron recommandé (crontab -e sur le VPS) :
#   0 3 * * *  cd /opt/dorloter && ./scripts/backup.sh >> /var/log/dorloter-backup.log 2>&1
#
# Pré-requis :
#   - .env.production rempli (S3_BACKUP_* configurés)
#   - Docker sur le VPS (utilisé via image amazon/aws-cli, aucune dépendance
#     à installer sur l'hôte)
#
# Stratégie :
#   - Dump PG compressé (gzip ~10:1 sur du texte SQL)
#   - Archive tar du volume MinIO (fichiers déjà compressés)
#   - Upload S3 via aws-cli en container
#   - Rétention locale : 7 derniers jours
#   - Rétention distante : gérée côté lifecycle du bucket (configurée une fois
#     dans la console du provider, ex. OVH → cycle de vie → supprimer après 30 jours)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

if [[ -f .env.production ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.production
  set +a
else
  echo "❌ .env.production introuvable" >&2
  exit 1
fi

TS=$(date +%Y%m%d-%H%M%S)
BACKUP_ROOT="./backups"
BACKUP_DIR="$BACKUP_ROOT/$TS"
mkdir -p "$BACKUP_DIR"

export COMPOSE_PROJECT_NAME=dorloter-prod
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"

# ─── Dump Postgres ──────────────────────────────────────────────────────────
echo "📦 Dump Postgres…"
$COMPOSE exec -T postgres pg_dump \
  -U "${POSTGRES_SUPERUSER:-dorloter}" \
  --no-owner \
  --no-privileges \
  dorloter \
  | gzip -9 > "$BACKUP_DIR/db.sql.gz"

PG_SIZE=$(du -h "$BACKUP_DIR/db.sql.gz" | cut -f1)
echo "   → $PG_SIZE"

# ─── Archive MinIO ──────────────────────────────────────────────────────────
echo "📦 Archive MinIO…"
# Container alpine temporaire : monte le volume MinIO en read-only + le
# dossier de backup. Pas besoin d'arrêter MinIO : les fichiers uploadés
# sont immuables (chaque upload a un nom unique).
VOLUME_NAME="dorloter-prod_miniodata"
docker run --rm \
  -v "${VOLUME_NAME}:/data:ro" \
  -v "$ROOT_DIR/$BACKUP_DIR:/backup" \
  alpine:3 \
  tar cf /backup/minio.tar -C /data .

MINIO_SIZE=$(du -h "$BACKUP_DIR/minio.tar" | cut -f1)
echo "   → $MINIO_SIZE"

# ─── Upload S3 (OVH Object Storage ou autre provider compatible) ────────────
if [[ -n "${S3_BACKUP_ENDPOINT:-}" && -n "${S3_BACKUP_BUCKET:-}" ]]; then
  echo "☁️  Upload vers ${S3_BACKUP_ENDPOINT}/${S3_BACKUP_BUCKET}…"
  docker run --rm \
    -e AWS_ACCESS_KEY_ID="${S3_BACKUP_ACCESS_KEY:?manquant}" \
    -e AWS_SECRET_ACCESS_KEY="${S3_BACKUP_SECRET_KEY:?manquant}" \
    -e AWS_DEFAULT_REGION="${S3_BACKUP_REGION:-gra}" \
    -v "$ROOT_DIR/$BACKUP_DIR:/backup:ro" \
    amazon/aws-cli:latest \
    s3 cp --recursive \
      --endpoint-url "$S3_BACKUP_ENDPOINT" \
      /backup "s3://${S3_BACKUP_BUCKET}/$TS/"
  echo "   → ok"
else
  echo "⚠️  S3_BACKUP_ENDPOINT / S3_BACKUP_BUCKET non définis, backup local uniquement"
fi

# ─── Rétention locale : 7 derniers jours ────────────────────────────────────
echo "🧹 Purge des anciens backups locaux…"
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d \
  -printf '%T+ %p\n' \
  | sort -r \
  | tail -n +8 \
  | cut -d' ' -f2- \
  | xargs -r rm -rf

echo "✅ Backup $TS terminé"
