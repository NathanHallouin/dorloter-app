#!/usr/bin/env bash
# Lance une session dev mobile complète :
#   1. Vérifie que postgres + minio tournent (`docker compose ps`)
#   2. Vérifie qu'au moins un device Android est joignable via adb
#   3. Vérifie que ngrok est dispo et lance le tunnel HTTP vers le port 3000
#   4. Affiche les commandes à lancer dans des terminaux séparés :
#      - backend Next.js (avec HOSTNAME=0.0.0.0 pour écouter le LAN)
#      - Metro Expo en mode tunnel, avec EXPO_PUBLIC_API_BASE_URL pointant
#        sur l'URL ngrok publique
#
# On ne lance pas tout dans le même terminal — Metro est interactif (touches
# r, j, …) et le backend a son propre output. On préfère le user en mode 3
# panes tmux ou 3 onglets terminal.

set -euo pipefail

cd "$(dirname "$0")/.."

# ─── 1. Stack Docker dev ─────────────────────────────────────────────────────

if ! command -v docker >/dev/null 2>&1; then
  echo "✗ docker manquant — installe Docker Desktop avec WSL2 backend."
  exit 1
fi

if ! docker compose -f docker-compose.yml ps --status running --quiet | read -r _; then
  echo "→ Postgres / MinIO ne tournent pas, lancement..."
  docker compose -f docker-compose.yml up -d
fi
echo "✓ Postgres + MinIO up"

# ─── 2. Device Android ───────────────────────────────────────────────────────

if ! command -v adb >/dev/null 2>&1; then
  echo "✗ adb non installé — lance scripts/mobile-android-attach.sh d'abord."
  exit 1
fi

DEVICES="$(adb devices | tail -n +2 | grep -E "device$" | wc -l)"
if [ "${DEVICES}" -eq 0 ]; then
  echo "✗ Aucun device Android attaché à WSL."
  echo "  → Lance : bun mobile:attach"
  exit 1
fi
echo "✓ ${DEVICES} device(s) Android attaché(s)"

# ─── 3. Ngrok ────────────────────────────────────────────────────────────────

if ! command -v ngrok >/dev/null 2>&1; then
  cat <<EOF
✗ ngrok non installé.

Une fois :
  curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc | \
    sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
  echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | \
    sudo tee /etc/apt/sources.list.d/ngrok.list
  sudo apt update && sudo apt install ngrok

Puis configure le authtoken (compte gratuit suffit) :
  ngrok config add-authtoken VOTRE_TOKEN_ICI
EOF
  exit 1
fi

echo "✓ ngrok dispo"
echo ""

# ─── 4. Imprimer la procédure 3-terminaux ────────────────────────────────────

cat <<EOF
═══════════════════════════════════════════════════════════════════════════
   Procédure : ouvre 3 onglets terminal ou panes tmux
═══════════════════════════════════════════════════════════════════════════

▸ Terminal 1 — Backend Next.js (sur 0.0.0.0 pour le LAN)
  ─────────────────────────────────────────────────────
  HOSTNAME=0.0.0.0 bun --cwd apps/web run dev

▸ Terminal 2 — Tunnel ngrok vers le backend
  ─────────────────────────────────────────────────────
  ngrok http 3000

  Attends que l'URL https://xxxxx.ngrok-free.app s'affiche. Copie-la.

▸ Terminal 3 — Metro Expo (Dev Client)
  ─────────────────────────────────────────────────────
  EXPO_PUBLIC_API_BASE_URL="https://xxxxx.ngrok-free.app/api/v1" \\
    bun --cwd apps/mobile run start --tunnel

  Ouvre le Dev Client APK sur ton phone, tap "Enter URL manually",
  paste l'URL Metro affichée (du genre exp+dorloter://exp.host/...).

▸ Smoke test depuis le phone (browser)
  ─────────────────────────────────────────────────────
  Ouvre https://xxxxx.ngrok-free.app/api/v1/openapi.json
  → tu dois voir le JSON OpenAPI. Si oui, l'app pourra parler à l'API.

▸ Hot reload
  ─────────────────────────────────────────────────────
  Modifie un .tsx dans apps/mobile/, sauvegarde → reload immédiat sur
  le phone. Pas besoin de rebuild le Dev Client tant que tu touches
  pas aux native deps.

═══════════════════════════════════════════════════════════════════════════
EOF
