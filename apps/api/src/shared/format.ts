/** Formatage des valeurs exposées dans les DTOs (dates RFC 3339, dates civiles). */

/** `timestamptz` -> RFC 3339 (UTC). */
export function toIso(value: Date): string {
  return value.toISOString();
}

/** `timestamptz` nullable -> RFC 3339 ou `null`. */
export function toIsoOrNull(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

/** Nettoie une chaîne optionnelle : trim, et vide -> `null`. */
export function clean(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Déduplique une liste d'identifiants en préservant l'unicité. */
export function unique<T>(values: Iterable<T>): T[] {
  return [...new Set(values)];
}
