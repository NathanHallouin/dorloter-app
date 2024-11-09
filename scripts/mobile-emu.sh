#!/usr/bin/env bash
# Session dev mobile sur émulateur Android (Windows host depuis WSL2).
#
# Pourquoi un script séparé de `mobile-dev.sh` :
#   - Pas besoin de tunnel cloudflared : l'émulateur joint le host via
#     l'alias spécial 10.0.2.2:3000
#   - Pas besoin de Metro tunnel : Metro tourne sur 0.0.0.0:8081 dans WSL,
#     que l'émulateur Windows atteint via 10.0.2.2:8081
#   - Setup local pur → feedback loop plus rapide qu'avec un phone réel
#
# Setup UNE fois (côté Windows host) :
#   1. Installer Android Studio : https://developer.android.com/studio
#   2. Android Studio → Tools → Device Manager → Create Device
#        - Hardware : Pixel 7
#        - System Image : Android 14 (API 34) en x86_64
#        - Finish → Play (icône ▶)
#   3. Une fois l'émulateur lancé, drag-and-drop dessus le dev-client APK
#      téléchargé depuis le lien EAS de `bun mobile:build`.
#      (EAS génère un APK universel qui supporte x86_64 par défaut.)
#
# Daily workflow :
#   Terminal 1 :  cd apps/web && bun run dev
#   Terminal 2 :  bun mobile:emu
#   Émulateur  :  ouvre "Dorloter Dev" → "Enter URL manually"
#                 → exp://10.0.2.2:8081
#
# Hot reload actif : modifie un .tsx, sauvegarde, l'émulateur recharge.

set -euo pipefail

cd "$(dirname "$0")/.."

# ─── Backend Next.js joignable ───────────────────────────────────────────────

if ! curl -fsS --max-time 2 http://localhost:3000/api/v1/openapi.json >/dev/null 2>&1; then
  cat <<EOF
✗ Backend Next.js injoignable sur http://localhost:3000.

Lance d'abord dans un autre terminal :
  cd apps/web && bun run dev
EOF
  exit 1
fi
echo "✓ Backend Next.js OK sur :3000"
echo ""

# ─── Metro en mode LAN (pas tunnel) ──────────────────────────────────────────

cat <<EOF
═══════════════════════════════════════════════════════════════════════════
  Metro démarre sur 0.0.0.0:8081. Sur l'émulateur Android :

    1. Vérifie qu'il tourne (Android Studio → Device Manager)
    2. Ouvre l'app Dorloter Dev
    3. Tap "Enter URL manually"
    4. Colle : exp://10.0.2.2:8081
       (10.0.2.2 = alias spécial AVD vers l'host Windows ; via WSL2
        mirrored networking, ça résout sur le Metro de WSL)

  Ctrl+C pour arrêter Metro.
═══════════════════════════════════════════════════════════════════════════

EOF

cd apps/mobile
exec env \
  EXPO_PUBLIC_API_BASE_URL="http://10.0.2.2:3000/api/v1" \
  bun run start --host lan
