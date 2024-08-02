/**
 * GET /api/v1/pets/{id}
 *
 * Fiche détaillée d'un animal à adopter (publique). Retourne le pet + ses
 * photos + son refuge minimal. Utilisé par les clients mobiles et les
 * intégrations tierces (RSS, exports, etc.).
 *
 * Format de réponse : `{ data: PetWithDetails }` — voir `dtos/pet.ts`.
 *
 * Pas d'auth requise (route publique). Pas de rate-limit explicite — le
 * load est lecture seule, mis en cache CDN par défaut.
 */

import { z } from "zod";
import { withApi, apiOk } from "@infra/api";
import { getPetWithDetailsService } from "@adoption/public";
import { toPetDto } from "@/app/api/v1/_dtos/pet";

const paramsSchema = z.object({
  id: z.string().uuid("L'identifiant doit être un UUID."),
});

export const GET = withApi(
  {
    paramsSchema,
  },
  async ({ params, requestId }) => {
    const pet = await getPetWithDetailsService(params.id);
    return apiOk(toPetDto(pet), { requestId });
  }
);
