/**
 * Pagination cursor-based — helpers d'encodage/décodage.
 *
 * Forme du cursor : un objet `{ ts, id }` (timestamp + UUID du dernier
 * item de la page) sérialisé en base64url. Un curseur opaque côté client
 * — on peut changer son contenu plus tard sans casser le contrat API.
 *
 * Utilisation typique côté service :
 *   1. Décoder le cursor entrant : `decodeCursor<{ ts: string; id: string }>(c)`
 *   2. Appliquer en SQL : `WHERE (created_at, id) < ($ts::timestamp, $id::uuid)`
 *   3. Encoder le cursor sortant à partir du dernier item : `encodeCursor({ ts, id })`
 *
 * Pourquoi pas l'offset : avec une liste qui change vite (signalements,
 * adoptions), l'offset peut faire sauter ou dupliquer des items entre
 * pages. Le cursor est stable.
 *
 * Safety : on log mais ne throw pas sur cursor invalide — on préfère
 * traiter comme "première page" plutôt que casser l'expérience client.
 */

import { validationFailed } from "./errors";

/** Encode un payload en cursor opaque (base64url). */
export function encodeCursor<T>(payload: T): string {
  const json = JSON.stringify(payload);
  return base64UrlEncode(json);
}

/**
 * Décode un cursor. Throw `VALIDATION_FAILED` si le cursor est
 * structurellement invalide. Le caller est responsable de valider la
 * forme du payload (avec Zod par exemple).
 */
export function decodeCursor<T>(cursor: string): T {
  try {
    const json = base64UrlDecode(cursor);
    return JSON.parse(json) as T;
  } catch {
    throw validationFailed("Cursor de pagination invalide.");
  }
}

// ─── base64url helpers (browser-safe via Buffer alias en Node) ────────────

function base64UrlEncode(s: string): string {
  // Buffer en Node, btoa en navigateur. On est server-side ici (routes
  // API tournent sur Node), donc Buffer est dispo.
  return Buffer.from(s, "utf-8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(s: string): string {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + padding, "base64").toString("utf-8");
}
