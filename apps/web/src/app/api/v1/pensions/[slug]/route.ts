/**
 * GET /api/v1/pensions/{slug}
 *
 * Fiche détaillée d'une pension agréée. Retourne uniquement les
 * pensions vérifiées (les fiches en attente sont 404).
 *
 * Inclut : photos, services jsonb normalisés (tous les keys retournés
 * avec true/false), note moyenne, agrément SIRET, coordonnées.
 *
 * Pas d'auth requise.
 */

import { z } from "zod";
import { withApi, apiOk } from "@infra/api";
import { getPensionBySlugService } from "@pensions/public";
import { toPensionDto } from "@/app/api/v1/_dtos/pension";

const paramsSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide."),
});

export const GET = withApi(
  { paramsSchema },
  async ({ params, requestId }) => {
    const pension = await getPensionBySlugService(params.slug);
    return apiOk(toPensionDto(pension), { requestId });
  }
);
