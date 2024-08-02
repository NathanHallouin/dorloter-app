/**
 * POST /api/v1/favorites
 *
 * Toggle le pet `petId` dans la liste de favoris de l'utilisateur courant.
 *
 * Idempotent : ré-appel = état basculé. La réponse contient `isFavorite`
 * (la nouvelle vérité) et un contexte pour le toast (nom, candidatures
 * en cours).
 *
 * On utilise POST plutôt que PUT/DELETE séparés : le client n'a pas
 * toujours connaissance de l'état courant et ce design simplifie l'UI.
 */

import { z } from "zod";
import { withApi, apiOk } from "@infra/api";
import { toggleFavoriteService } from "@adoption/public";

const bodySchema = z.object({
  petId: z.string().uuid("L'identifiant doit être un UUID."),
});

export const POST = withApi(
  {
    authRequired: true,
    bodySchema,
    rateLimit: { key: "api:favorites:toggle", limit: 60, windowSec: 60 },
  },
  async ({ body, session, requestId }) => {
    const result = await toggleFavoriteService(session!.user.id, body.petId);
    return apiOk(result, { requestId });
  }
);
