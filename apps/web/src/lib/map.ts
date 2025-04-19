/** Style de tuiles MapLibre. OpenFreeMap : gratuit, open-source, sans clé. */
export const MAP_STYLE =
  import.meta.env.VITE_MAP_STYLE ?? "https://tiles.openfreemap.org/styles/liberty";

/** Centre par défaut (France métropolitaine) quand aucun point n'est connu. */
export const FRANCE_CENTER = { lat: 46.6, lng: 2.5 } as const;
