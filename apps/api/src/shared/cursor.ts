/**
 * Encodage / décodage des curseurs de pagination (cursor-based).
 *
 * Un curseur est un petit objet sérialisé en JSON puis encodé en Base64URL (sans
 * padding). Opaque pour le client : il le renvoie tel quel. Un curseur illisible
 * lève `INVALID_PARAM` plutôt qu'une 500.
 */

import { AppError } from './app-error';

/** Encode un curseur en Base64URL. `null` reste `null`. */
export function encodeCursor<T>(value: T | null): string | null {
  if (value === null || value === undefined) return null;
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

/** Décode un curseur. Vide ou absent -> `null`. Illisible -> `INVALID_PARAM`. */
export function decodeCursor<T>(cursor: string | null | undefined): T | null {
  if (cursor === null || cursor === undefined || cursor.trim() === '') return null;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as T;
  } catch {
    throw AppError.invalidParam('Curseur de pagination invalide.');
  }
}
