#!/usr/bin/env bash
# Attache un téléphone Android USB à WSL2 et liste les devices ADB.
#
# Pré-requis (à faire UNE fois, voir le bloc "PRÉ-REQUIS" plus bas) :
#   - Windows host : usbipd-win installé (`winget install usbipd`)
#   - WSL          : adb installé (`sudo apt install -y android-tools-adb`)
#   - Téléphone    : USB Debugging activé dans Developer Options
#
# Usage :
#   bun mobile:attach     → attache le 1er device Android trouvé + adb devices
#   bun mobile:devices    → juste `adb devices` (suppose déjà attaché)
#
# Le script est idempotent : ré-attacher un device déjà attaché est no-op.

set -euo pipefail

# ─── Pré-requis ──────────────────────────────────────────────────────────────

if ! command -v adb >/dev/null 2>&1; then
  cat <<EOF
✗ adb n'est pas installé dans WSL.

Lance dans WSL :
  sudo apt update && sudo apt install -y android-tools-adb

Puis relance ce script.
EOF
  exit 1
fi

if ! command -v powershell.exe >/dev/null 2>&1; then
  echo "✗ powershell.exe inaccessible — tu n'es pas dans WSL2 ?"
  exit 1
fi

USBIPD_VERSION="$(powershell.exe -NoProfile -Command 'usbipd --version' 2>/dev/null | tr -d '\r' || true)"
if [ -z "${USBIPD_VERSION}" ]; then
  cat <<EOF
✗ usbipd-win n'est pas installé sur le host Windows.

Lance dans un PowerShell Windows ADMIN :
  winget install --interactive --exact dorssel.usbipd-win

Puis ferme/rouvre WSL et relance ce script.
EOF
  exit 1
fi

echo "✓ adb dispo : $(adb version | head -n 1)"
echo "✓ usbipd-win : v${USBIPD_VERSION}"
echo ""

# ─── Lister les devices USB côté Windows ─────────────────────────────────────

echo "─── Devices USB côté Windows ───"
powershell.exe -NoProfile -Command 'usbipd list' 2>/dev/null | tr -d '\r'
echo ""

# Heuristique : on cherche le 1er BUSID dont la description contient "Android"
# ou "Phone" ou "Pixel" ou "OnePlus" etc. À adapter selon le constructeur.
BUSID="$(powershell.exe -NoProfile -Command "
  usbipd list |
  Select-String -Pattern '^\d+-\d+\s+\w+:\w+\s+(.*?Android|.*?Phone|.*?Pixel|.*?OnePlus|.*?Samsung|.*?Xiaomi|.*?Sony|.*?Huawei|.*?Motorola)' |
  ForEach-Object { (\$_ -split '\s+')[0] } |
  Select-Object -First 1
" 2>/dev/null | tr -d '\r')"

if [ -z "${BUSID}" ]; then
  cat <<EOF
✗ Aucun téléphone Android détecté côté Windows.

Vérifie que :
  1. Le téléphone est connecté en USB (et déverrouillé)
  2. Le mode "USB debugging" est activé (Developer options)
  3. Le mode USB est en "File transfer (MTP)" ou "Charging only" (pas Audio)

Si le device apparaît dans la liste ci-dessus mais avec une autre description,
attache-le manuellement :
  powershell.exe -Command "usbipd bind --busid X-Y; usbipd attach --wsl --busid X-Y"
  où X-Y est le BUSID affiché.
EOF
  exit 1
fi

echo "✓ Téléphone détecté : busid ${BUSID}"
echo ""

# ─── Bind + attach ────────────────────────────────────────────────────────────

# `bind` rend le device partageable avec WSL (nécessite admin la 1ère fois).
# `attach` le branche effectivement à WSL (fonctionne sans admin après bind).

echo "─── Bind (admin requis la 1ère fois) + attach ───"
powershell.exe -NoProfile -Command "
  Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile', '-Command', 'usbipd bind --busid ${BUSID}'
" 2>/dev/null || true

powershell.exe -NoProfile -Command "usbipd attach --wsl --busid ${BUSID}" 2>&1 | tr -d '\r'
echo ""

# ─── Vérifier côté ADB ───────────────────────────────────────────────────────

echo "─── adb devices ───"
adb kill-server >/dev/null 2>&1 || true
adb start-server >/dev/null 2>&1
sleep 1
adb devices

echo ""
cat <<EOF
Si tu vois "device" à côté du serial → tout est OK. Si tu vois "unauthorized",
regarde l'écran du téléphone : il y a une popup "Allow USB debugging from this
computer?" — accepte (et coche "Always allow" pour ne plus avoir à le faire).

Pour la suite : bun --cwd apps/mobile run start --tunnel
puis ouvre le Dev Client sur le phone et paste l'URL Metro.
EOF
