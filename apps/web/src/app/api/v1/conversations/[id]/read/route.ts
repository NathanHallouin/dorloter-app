/**
 * PATCH /api/v1/conversations/{id}/read
 *
 * Marque tous les messages reçus comme lus + reset le compteur unread du
 * côté appelant. Idempotent.
 *
 * Le mobile l'appelle au focus de l'écran thread, et après chaque envoi
 * réussi (le user est forcément à jour sur sa propre conversation).
 */

import { z } from "zod";
import { withApi, apiOk } from "@infra/api";
import { markConversationReadService } from "@messaging/public";

const paramsSchema = z.object({
  id: z.string().uuid("L'identifiant doit être un UUID."),
});

export const PATCH = withApi(
  { authRequired: true, paramsSchema },
  async ({ params, session, requestId }) => {
    const result = await markConversationReadService(
      {
        userId: session!.user.id,
        userRole: session!.user.role,
        userShelterId: session!.user.shelterId ?? null,
      },
      params.id
    );
    return apiOk(result, { requestId });
  }
);
