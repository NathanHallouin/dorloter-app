/**
 * GET /api/v1/reports/{id}
 *
 * Fiche détaillée d'un signalement perdu/trouvé. Inclut toutes les
 * photos et la description longue.
 *
 * Sécurité : pas de `contactPhone` ni `contactEmail` en clair. Le DTO
 * retourne `hasContact: boolean` ; la révélation passe par un endpoint
 * dédié (rate-limité, loggué).
 *
 * Pas d'auth requise pour les fiches `actif` et `resolu`. Les `expire`
 * sont masqués (404).
 */

import { z } from "zod";
import { withApi, apiOk } from "@infra/api";
import { getReportWithDetailsService } from "@lost-found/public";
import { toReportDto } from "@/app/api/v1/_dtos/report";

const paramsSchema = z.object({
  id: z.string().uuid("L'identifiant doit être un UUID."),
});

export const GET = withApi(
  { paramsSchema },
  async ({ params, requestId }) => {
    const report = await getReportWithDetailsService(params.id);
    return apiOk(toReportDto(report), { requestId });
  }
);
