/**
 * GET /api/v1/shelters/{slug}
 *
 * Fiche détaillée d'un refuge. Inclut stats publiques (à adopter,
 * réservés, adoptés, followers) et coordonnées complètes.
 *
 * Pas d'auth requise. `slug` doit matcher `^[a-z0-9](-[a-z0-9])*$`.
 */

import { z } from "zod";
import { withApi, apiOk } from "@infra/api";
import { getShelterBySlugService } from "@shelters/public";
import { toShelterDto } from "@/app/api/v1/_dtos/shelter";

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
    const shelter = await getShelterBySlugService(params.slug);
    return apiOk(toShelterDto(shelter), { requestId });
  }
);
