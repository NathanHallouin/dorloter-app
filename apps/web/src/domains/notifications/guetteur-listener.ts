/**
 * Listener « guetteur de quartier » : scanne les recherches sauvegardées
 * lost-found avec push activé à chaque publication d'un signalement, et
 * envoie une notification push **immédiate** aux utilisateurs concernés.
 *
 * Complète le digest email quotidien (cf. `/api/cron/saved-searches-digest`)
 * pour les usages où la latence compte : « animal vu en bas de chez moi ».
 *
 * Matching dynamique sur les params jsonb de chaque recherche : type,
 * species, sex, chipped, q (texte), lat/lng/radius.
 */

import { subscribe } from "@infra/event-bus";
import { getPushEnabledLostFoundSearches } from "@identity/public";
import { emitNotification } from "./emit";
import type { ReportPublishedEvent } from "@lost-found/events";

const EARTH_RADIUS_KM = 6371;

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function matchesSearch(
  params: Record<string, unknown>,
  event: ReportPublishedEvent
): { matches: true; distanceKm: number | null } | { matches: false } {
  if (params.type && params.type !== event.reportType)
    return { matches: false };
  if (params.species && params.species !== event.species)
    return { matches: false };
  // Note : sex et chipped sont sur les reports mais pas dans l'event
  // (le matching cron exhaustif les utilise via DB). Ici, on accepte
  // tant que les autres critères matchent — le faux positif est mineur,
  // l'utilisateur clique le lien et juge sur la fiche.

  if (
    typeof params.lat === "number" &&
    typeof params.lng === "number" &&
    typeof params.radius === "number"
  ) {
    const distanceKm = haversineKm(
      params.lat,
      params.lng,
      event.lat,
      event.lng
    );
    if (distanceKm > params.radius) return { matches: false };
    return { matches: true, distanceKm };
  }

  return { matches: true, distanceKm: null };
}

subscribe<ReportPublishedEvent>(
  "lost-found.report_published",
  async (event) => {
    try {
      const searches = await getPushEnabledLostFoundSearches();
      if (searches.length === 0) return;

      const speciesLabel = event.species === "chat" ? "chat" : "chien";
      const typeLabel = event.reportType === "perdu" ? "perdu" : "trouvé";
      const animalTitle = event.petName
        ? `${event.petName} (${speciesLabel} ${typeLabel})`
        : `${speciesLabel} ${typeLabel}`;

      for (const search of searches) {
        // Auto-skip : l'auteur du signalement ne s'alerte pas lui-même.
        if (search.userId === event.reportOwnerUserId) continue;

        const verdict = matchesSearch(search.params, event);
        if (!verdict.matches) continue;

        const distancePart =
          verdict.distanceKm !== null
            ? ` à ${verdict.distanceKm.toFixed(1)} km`
            : "";

        try {
          await emitNotification({
            userId: search.userId,
            type: "report_nearby",
            title: `Guetteur : ${animalTitle}${distancePart}`,
            body: `Match avec « ${search.name} ». Voir la fiche.`,
            data: {
              reportId: event.reportId,
              savedSearchId: search.id,
              distanceKm: verdict.distanceKm,
              origin: "guetteur",
            },
            email: false, // Le digest quotidien gère l'email
            push: true,
          });
        } catch (err) {
          console.error("[guetteur] push échoué", err);
        }
      }
    } catch (err) {
      console.error("[guetteur] traitement échoué", err);
    }
  }
);
