/**
 * GET /api/v1/me/favorites
 *
 * Liste des `petId` favoris de l'utilisateur courant. Le client mobile
 * en fait un `Set<string>` pour piloter le rendu des cœurs sur les
 * cards Adopter. Pas de pagination — un user typique en a < 100.
 */

import { withApi, apiOk } from "@infra/api";
import { listFavoritePetIdsService } from "@adoption/public";

export const GET = withApi(
  { authRequired: true },
  async ({ session, requestId }) => {
    const petIds = await listFavoritePetIdsService(session!.user.id);
    return apiOk({ petIds }, { requestId });
  }
);
