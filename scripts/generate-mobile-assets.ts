/**
 * Génère les assets PNG de l'app mobile (icon, adaptive-icon, splash) à
 * partir d'un SVG source.
 *
 * Usage : bun mobile:assets
 *
 * Sortie :
 *   apps/mobile/assets/icon.png            1024×1024  iOS + tools (master)
 *   apps/mobile/assets/adaptive-icon.png   1024×1024  Android adaptive (foreground)
 *   apps/mobile/assets/splash.png          200×200    splash logo (centré)
 *
 * Design : carré arrondi orange (#e8634d) avec une silhouette de patte
 * stylisée en blanc. Branding cohérent avec la palette web (cf. globals.css).
 *
 * Quand un designer livrera la vraie identité, remplacer ce script par
 * les fichiers fournis et supprimer ce générateur (commit dédié).
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// ─── SVG source ──────────────────────────────────────────────────────────────

const BG_COLOR = "#e8634d";
const FG_COLOR = "#ffffff";

/**
 * Patte stylisée centrée dans un viewBox 1024×1024 :
 *   - 4 toes en arc de cercle en haut
 *   - 1 pad ovale en bas
 *
 * Marges (16% chaque côté) pour le safe-zone Android adaptive (66%).
 */
function pawPath(): string {
  return `
    <!-- Toe 1 (extrême gauche) -->
    <ellipse cx="290" cy="450" rx="80" ry="100" fill="${FG_COLOR}"/>
    <!-- Toe 2 -->
    <ellipse cx="430" cy="370" rx="80" ry="105" fill="${FG_COLOR}"/>
    <!-- Toe 3 -->
    <ellipse cx="595" cy="370" rx="80" ry="105" fill="${FG_COLOR}"/>
    <!-- Toe 4 (extrême droite) -->
    <ellipse cx="735" cy="450" rx="80" ry="100" fill="${FG_COLOR}"/>
    <!-- Pad principal -->
    <ellipse cx="512" cy="700" rx="220" ry="180" fill="${FG_COLOR}"/>
  `;
}

const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="200" fill="${BG_COLOR}"/>
  ${pawPath()}
</svg>
`;

// Adaptive icon Android : pas de background dans le SVG (l'OS rend le bg).
// Foreground centré dans 1024×1024 mais visuellement plus petit (safe zone 66%).
const adaptiveIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${BG_COLOR}"/>
  ${pawPath()}
</svg>
`;

// Splash : juste le logo centré, fond rendu par expo-splash-screen via
// `backgroundColor: #fff5f1`. On garde 200×200 pour rester compact.
const splashSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="200" fill="${BG_COLOR}"/>
  ${pawPath()}
</svg>
`;

// ─── Génération ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const out = (file: string) =>
    resolve(here, "../apps/mobile/assets", file);

  await Promise.all([
    sharp(Buffer.from(iconSvg)).png().toFile(out("icon.png")),
    sharp(Buffer.from(adaptiveIconSvg)).png().toFile(out("adaptive-icon.png")),
    sharp(Buffer.from(splashSvg)).png().toFile(out("splash.png")),
  ]);

  // eslint-disable-next-line no-console
  console.log("✓ Assets mobile générés :");
  console.log("    apps/mobile/assets/icon.png");
  console.log("    apps/mobile/assets/adaptive-icon.png");
  console.log("    apps/mobile/assets/splash.png");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Échec génération des assets mobile:", err);
  process.exit(1);
});
