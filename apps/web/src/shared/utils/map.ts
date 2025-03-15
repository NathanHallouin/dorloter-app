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

/**
 * Catégorie d'un point affiché sur la carte France `/carte`. Sert à
 * sélectionner le marqueur (couleur, icône) et à filtrer les layers.
 */
export type MapPointKind =
  | "refuge"
  | "pension"
  | "veto"
  | "report-perdu"
  | "report-trouve";

/**
 * Représentation minimale d'un acteur ou signalement géolocalisé,
 * sérialisée vers le client pour rendu MapLibre. Chaque domaine expose
 * une `getMapPoints()` retournant ce type. Aucun champ DB sensible.
 */
export interface MapPoint {
  id: string;
  kind: MapPointKind;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string | null;
  href: string;
  isVerified?: boolean;
  isDemo?: boolean;
}

export const MAP_POINT_KIND_LABELS: Record<MapPointKind, string> = {
  refuge: "Refuges",
  pension: "Pensions",
  veto: "Vétérinaires",
  "report-perdu": "Animaux perdus",
  "report-trouve": "Animaux trouvés",
};
