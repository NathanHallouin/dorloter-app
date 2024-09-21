/**
 * GET /api/v1/me/favorites/pets
 *
 * Renvoie les animaux favorisés par l'utilisateur courant, en version
 * `PetSummary` complète (à différence de `/me/favorites` qui ne renvoie
 * que les ids).
 *
 * Les animaux passés en statut `reserve` / `adopte` restent dans la liste
 * (l'utilisateur veut suivre leur sort) — c'est `listPetsService` qui
 * désactive automatiquement le filtre `disponible` quand `petIds` est
 * fourni.
 *
 * Pas de pagination (un user a typiquement < 50 favoris).
 */

import { withApi, apiOk } from "@infra/api";
import {
  listFavoritePetIdsService,
  listPetsService,
} from "@adoption/public";
import { toPetSummaryDto } from "@/app/api/v1/_dtos/pet";

export const GET = withApi(
  { authRequired: true },
  async ({ session, requestId }) => {
    const petIds = await listFavoritePetIdsService(session!.user.id);
    if (petIds.length === 0) {
      return apiOk([], { requestId });
    }

    const { pets } = await listPetsService({
      filters: { petIds },
      limit: 100,
    });

    // L'ordre retourné par listPets est createdAt DESC ; on remappe sur
    // l'ordre des favoris (du plus récent ajout au plus ancien) pour
    // refléter ce que l'utilisateur attend.
    const order = new Map(petIds.map((id, i) => [id, i]));
    const sorted = [...pets].sort(
      (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
    );

    return apiOk(
      sorted.map(toPetSummaryDto),
      { requestId }
    );
  }
);
