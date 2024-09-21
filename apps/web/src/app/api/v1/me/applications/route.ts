/**
 * GET /api/v1/me/applications
 *
 * Liste des candidatures d'adoption de l'utilisateur courant, avec un
 * résumé de l'animal concerné (nom, photo, statut). Tri par date de
 * création décroissante. Pas de pagination en MVP (un user a typiquement
 * < 20 candidatures).
 *
 * Auth requise.
 */

import { withApi, apiOk } from "@infra/api";
import {
  getApplicationsByUser,
  getPrimaryPhotosForPets,
} from "@adoption/public";
import { toMyApplicationDto } from "@/app/api/v1/_dtos/application";

export const GET = withApi(
  { authRequired: true },
  async ({ session, requestId }) => {
    const rows = await getApplicationsByUser(session!.user.id);
    const petIds = rows.map((r) => r.pet.id);
    const photoMap = await getPrimaryPhotosForPets(petIds);

    const items = rows.map((row) =>
      toMyApplicationDto({
        application: row.application,
        pet: row.pet,
        primaryPhotoUrl: photoMap.get(row.pet.id) ?? null,
      })
    );

    return apiOk(items, { requestId });
  }
);
