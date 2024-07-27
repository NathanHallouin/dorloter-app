/**
 * Style MapLibre utilisé par tous les composants de carte de l'app.
 *
 * Par défaut : MapTiler Positron (light, grayscale — idéal pour overlay
 * de marqueurs colorés sans bruit visuel). 100k loads/mois gratuits.
 * Fallback : OpenFreeMap si la clé est manquante (pas de blocage en dev
 * sans compte MapTiler).
 *
 * Pour changer de style : "streets-v2", "basic-v2", "bright-v2",
 * "dataviz", "outdoor-v2"… voir https://cloud.maptiler.com/maps/
 */
export function getMapStyle(): string {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (key) {
    return `https://api.maptiler.com/maps/positron/style.json?key=${key}`;
  }
  return "https://tiles.openfreemap.org/styles/positron";
}
