/**
 * GET /api/v1/pets/{id}/similar
 *
 * Animaux similaires au pet de référence — alimente la section "Vous
 * pourriez aimer aussi" sur la fiche détail. Heuristique : même espèce,
 * même catégorie d'âge en priorité, même refuge bonus.
 *
 * Query : `?limit=4` (défaut 4, max 12).
 * Réponse : `{ data: PetSummaryDto[] }`.
 */

import { z } from "zod";
import { withApi, apiOk } from "@infra/api";
import { getSimilarPetsService } from "@adoption/public";
import { toPetSummaryDto } from "@/app/api/v1/_dtos/pet";

const paramsSchema = z.object({
  id: z.string().uuid("L'identifiant doit être un UUID."),
});

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(12).optional(),
});

export const GET = withApi(
  { paramsSchema, querySchema },
  async ({ params, query, requestId }) => {
    const pets = await getSimilarPetsService(params.id, {
      limit: query.limit,
    });
    return apiOk(pets.map(toPetSummaryDto), { requestId });
  }
);
