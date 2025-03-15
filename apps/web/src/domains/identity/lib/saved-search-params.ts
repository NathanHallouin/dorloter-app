import { z } from "zod";

/**
 * Schémas Zod normalisés pour les params d'une recherche sauvegardée.
 * On miroite les query params des listings publics (`/adopter/liste`,
 * `/perdus-trouves`) en les normalisant côté serveur pour rester
 * comparable d'une fois sur l'autre et matchable par le cron.
 */

export const adoptionSearchParamsSchema = z
  .object({
    species: z.enum(["chat", "chien"]).optional(),
    sex: z.enum(["male", "femelle", "inconnu"]).optional(),
    ageCategory: z
      .enum(["chaton", "jeune", "adulte", "senior"])
      .optional(),
    okWithCats: z.enum(["oui", "non", "inconnu"]).optional(),
    okWithDogs: z.enum(["oui", "non", "inconnu"]).optional(),
    okWithChildren: z.enum(["oui", "non", "inconnu"]).optional(),
    search: z.string().trim().max(120).optional(),
    breed: z.string().trim().max(120).optional(),
    color: z.string().trim().max(120).optional(),
  })
  .strict();

export type AdoptionSearchParams = z.infer<typeof adoptionSearchParamsSchema>;

/**
 * On garde les noms tels qu'ils sont dans le querystring de
 * `/perdus-trouves` (`type`, `q`, `lat`, `lng`, `radius`, `since`) plutôt
 * que renommer en `centerLat` etc. Permet de stocker et rejouer la
 * recherche sans transformation intermédiaire.
 */
export const lostFoundSearchParamsSchema = z
  .object({
    type: z.enum(["perdu", "trouve"]).optional(),
    species: z.enum(["chat", "chien"]).optional(),
    sex: z.enum(["male", "femelle", "inconnu"]).optional(),
    chipped: z.boolean().optional(),
    q: z.string().trim().max(120).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    radius: z.number().int().min(1).max(200).optional(),
    since: z.enum(["24h", "7d", "30d"]).optional(),
  })
  .strict();

export type LostFoundSearchParams = z.infer<
  typeof lostFoundSearchParamsSchema
>;

export type SavedSearchParams = AdoptionSearchParams | LostFoundSearchParams;

/**
 * Reconstruit un querystring depuis des params normalisés, pour rejouer
 * une recherche sauvegardée (« lien Re-lancer »).
 */
export function paramsToQueryString(
  params: Record<string, unknown>
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  return search.toString();
}

/**
 * Décrit en français une liste de filtres pour l'affichage. On évite les
 * libellés bruts type "okWithChildren=oui".
 */
const FILTER_LABELS: Record<string, (value: string) => string> = {
  species: (v) => (v === "chat" ? "Chats" : "Chiens"),
  type: (v) => (v === "perdu" ? "Perdus" : "Trouvés"),
  sex: (v) =>
    v === "male" ? "Mâles" : v === "femelle" ? "Femelles" : "Sexe indéterminé",
  ageCategory: (v) =>
    ({
      chaton: "Chatons / chiots",
      jeune: "Jeunes",
      adulte: "Adultes",
      senior: "Seniors",
    })[v] ?? v,
  okWithCats: (v) => (v === "oui" ? "OK chats" : `Chats : ${v}`),
  okWithDogs: (v) => (v === "oui" ? "OK chiens" : `Chiens : ${v}`),
  okWithChildren: (v) =>
    v === "oui" ? "OK enfants" : `Enfants : ${v}`,
  search: (v) => `« ${v} »`,
  q: (v) => `« ${v} »`,
  breed: (v) => `Race : ${v}`,
  color: (v) => `Couleur : ${v}`,
  chipped: (v) => (v === "true" ? "Identifié·e" : "Sans puce"),
  radius: (v) => `Dans ${v} km`,
  radiusKm: (v) => `Dans ${v} km`,
  since: (v) =>
    ({ "24h": "Dernières 24 h", "7d": "Dernière semaine", "30d": "Dernier mois" })[
      v
    ] ?? v,
};

export function describeParams(
  params: Record<string, unknown>
): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    const fn = FILTER_LABELS[key];
    if (fn) out.push(fn(String(value)));
  }
  return out;
}
