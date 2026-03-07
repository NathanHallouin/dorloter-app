#!/usr/bin/env bash
# Session dev mobile en UNE commande · Metro tunnel + cloudflared backend auto.
#
# Workflow EAS dev-client cloud (pas de USB, pas de WSL2 adb) :
#   1. Tu as installé le dev-client APK sur ton phone (`bun mobile:build`).
#   2. Tu lances l'API dans un terminal séparé : `cd apps/api && bun dev`.
#   3. Tu lances ce script. Il :
#        a. vérifie que l'API NestJS répond sur :8080
#        b. lance cloudflared quick tunnel en background (backend → https public)
#        c. extrait l'URL trycloudflare.com depuis les logs
#        d. exporte EXPO_PUBLIC_API_BASE_URL = <cf>/api/v1
#        e. lance `expo start --tunnel` qui sert le bundle JS au phone
#   4. Sur le phone : ouvre le dev-client, scanne le QR Metro affiché.
#   5. Ctrl+C ici → kill cloudflared + Metro proprement.
#
# Pourquoi cloudflared et pas ngrok :
#   - Gratuit, illimité, sans compte
#   - Plusieurs tunnels simultanés (ngrok free = 1 session, ce qui rentre
#     en conflit avec celui que `expo start --tunnel` lance pour Metro)
#
# Pré-requis (à faire UNE fois) :
#   - eas-cli installé + connecté : `bun add -g eas-cli && eas login`
#   - cloudflared installé (cf. message d'erreur si absent)
#   - dev-client APK installé sur le phone (via `bun mobile:build`)

set -euo pipefail

cd "$(dirname "$0")/.."

# ─── Pré-requis ──────────────────────────────────────────────────────────────

if ! command -v cloudflared >/dev/null 2>&1; then
  cat <<'EOF'
✗ cloudflared non installé.

Installation rapide (Ubuntu/WSL) :
  curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
    -o /tmp/cloudflared.deb
  sudo dpkg -i /tmp/cloudflared.deb
  rm /tmp/cloudflared.deb

Vérification : cloudflared --version
EOF
  exit 1
fi

# ─── 1. API Dorloter joignable ───────────────────────────────────────────────

if ! curl -fsS --max-time 2 http://localhost:8080/api/v1/health >/dev/null 2>&1; then
  cat <<EOF
✗ API Dorloter injoignable sur http://localhost:8080.

Lance d'abord dans un autre terminal :
  cd apps/api && bun dev

Puis relance ce script.
EOF
  exit 1
fi
echo "✓ API Dorloter OK sur :8080"

# ─── 2. Tunnel cloudflared backend ───────────────────────────────────────────

CF_LOG="$(mktemp -t dorloter-cf.XXXXXX)"
cloudflared tunnel --url http://localhost:8080 --no-autoupdate \
  >"${CF_LOG}" 2>&1 &
CF_PID=$!

cleanup() {
  echo ""
  echo "→ Arrêt cloudflared (pid ${CF_PID})"
  kill "${CF_PID}" 2>/dev/null || true
  wait "${CF_PID}" 2>/dev/null || true
  rm -f "${CF_LOG}"
}
trap cleanup EXIT INT TERM

# Cloudflared imprime l'URL après quelques secondes · poll max ~15s.
CF_URL=""
for _ in $(seq 1 30); do
  CF_URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "${CF_LOG}" \
    | head -1 || true)"
  if [ -n "${CF_URL}" ]; then break; fi
  sleep 0.5
done

if [ -z "${CF_URL}" ]; then
  echo "✗ Impossible de récupérer l'URL cloudflared après 15s."
  echo "  Dernières lignes de log :"
  tail -20 "${CF_LOG}"
  exit 1
fi

API_BASE_URL="${CF_URL}/api/v1"
echo "✓ Tunnel backend : ${CF_URL}"

# Smoke test : le tunnel met parfois quelques secondes à se propager.
SMOKE_OK=false
for _ in $(seq 1 10); do
  if curl -fsS --max-time 3 "${API_BASE_URL}/health" >/dev/null 2>&1; then
    SMOKE_OK=true
    break
  fi
  sleep 1
done
if [ "${SMOKE_OK}" = true ]; then
  echo "✓ API joignable via cloudflared"
else
  echo "⚠ API pas encore joignable via ${CF_URL} · Metro tournera, réessaie depuis l'app si erreur réseau."
fi
echo ""

# ─── 3. Metro tunnel ─────────────────────────────────────────────────────────

cat <<EOF
═══════════════════════════════════════════════════════════════════════════
  Metro va démarrer en mode tunnel. Quand le QR apparaît :

    1. Ouvre l'app Dorloter Dev sur ton phone
    2. Tap "Scan QR code" ou utilise l'app Caméra Samsung
    3. Hot reload actif : tu modifies un .tsx, le phone recharge en ~1s

  Ctrl+C ici pour tout arrêter (cloudflared + Metro).
═══════════════════════════════════════════════════════════════════════════

EOF

cd apps/mobile
exec env EXPO_PUBLIC_API_BASE_URL="${API_BASE_URL}" bun run start --tunnel
