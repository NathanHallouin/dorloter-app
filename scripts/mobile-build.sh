#!/usr/bin/env bash
# Build EAS du dev-client mobile (cloud, ~15 min Android / ~30 min iOS).
#
# Le dev-client est un APK/IPA "Dorloter Dev" installé sur ton phone qui
# sait charger n'importe quel bundle JS servi par Metro. Tu ne le rebuild
# QUE quand tu ajoutes/changes une dépendance native (expo-*, react-native-*).
# Pour les changements JS quotidiens, `bun mobile:dev` suffit (hot reload).
#
# Usage :
#   bun mobile:build              → profile=development, platform=android
#   bun mobile:build preview      → profile=preview (staging)
#   bun mobile:build development ios
#
# Pré-requis (UNE fois) :
#   1. bun add -g eas-cli
#   2. eas login  (compte Expo gratuit — 30 builds/mois suffit)
#   3. cd apps/mobile && eas init  (renseigne le projectId dans app.config.ts)
#
# À la fin du build, EAS te donne :
#   - une page web avec QR code → scan depuis le phone, install l'APK
#   - un lien direct vers l'APK
#
# Important sur Android : si tu as déjà un APK installé avec une autre
# signature (ex. l'ancien `expo run:android` local), désinstalle-le avant :
#   adb uninstall fr.dorloter.app   (ou désinstall manuel depuis le phone)

set -euo pipefail

cd "$(dirname "$0")/../apps/mobile"

if ! command -v eas >/dev/null 2>&1; then
  cat <<EOF
✗ eas-cli non installé.

  bun add -g eas-cli
  eas login

Puis relance ce script.
EOF
  exit 1
fi

if ! eas whoami >/dev/null 2>&1; then
  echo "✗ Pas connecté à Expo. Lance : eas login"
  exit 1
fi

PROFILE="${1:-development}"
PLATFORM="${2:-android}"

echo "→ EAS build : profile=${PROFILE}, platform=${PLATFORM}"
echo "  (Build cloud, attends 10-30 min selon la plateforme.)"
echo ""
echo "  Note : --no-wait → on ne bloque pas après le build et on évite"
echo "  l'install automatique via adb (qui plante en WSL2 car l'émulateur"
echo "  tourne côté Windows host). Récupère l'APK ensuite via :"
echo "    eas build:list --limit 1 --platform ${PLATFORM}"
echo ""

exec eas build --platform "${PLATFORM}" --profile "${PROFILE}" --no-wait
