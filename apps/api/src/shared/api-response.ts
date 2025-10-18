/**
 * Enveloppes de réponse : `{ data }` et `{ data, pagination }`.
 *
 * Contrat stable partagé par les clients web et mobile. Les handlers renvoient
 * explicitement `ok(...)` ou `page(...)` (pas d'intercepteur global), pour que
 * les endpoints en 204 No Content restent sans corps.
 */

export interface ApiResponse<T> {
  data: T;
}

export interface PaginationMeta {
  /** Curseur de la page suivante ; `null` sur la dernière page. */
  cursor: string | null;
  hasMore: boolean;
}

export interface PageResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/** Enveloppe de succès : `{ "data": <payload> }`. */
export function ok<T>(data: T): ApiResponse<T> {
  return { data };
}

/**
 * Enveloppe de liste paginée à partir du curseur « suivant » :
 * `hasMore` est vrai si et seulement si un curseur existe.
 */
export function page<T>(data: T[], nextCursor: string | null): PageResponse<T> {
  return { data, pagination: { cursor: nextCursor, hasMore: nextCursor !== null } };
}
