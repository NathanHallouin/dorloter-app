import { sql } from "drizzle-orm";

/**
 * Crée un point PostGIS à partir de coordonnées longitude/latitude.
 * Utilise SRID 4326 (WGS84).
 */
export function stMakePoint(lng: number, lat: number) {
  return sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`;
}

/**
 * Calcule la distance en mètres entre deux colonnes geometry.
 * Cast en geography pour un résultat en mètres sur la sphère.
 */
export function stDistanceMeters(
  col1: ReturnType<typeof sql>,
  col2: ReturnType<typeof sql>
) {
  return sql<number>`ST_Distance(${col1}::geography, ${col2}::geography)`;
}

/**
 * Filtre les lignes dont la géométrie est dans un rayon donné (en mètres).
 */
export function stDWithin(
  col: ReturnType<typeof sql>,
  point: ReturnType<typeof sql>,
  distanceMeters: number
) {
  return sql`ST_DWithin(${col}::geography, ${point}::geography, ${distanceMeters})`;
}

/**
 * Convertit une colonne geometry en GeoJSON.
 */
export function stAsGeoJSON(col: ReturnType<typeof sql>) {
  return sql<string>`ST_AsGeoJSON(${col})`;
}
