/**
 * POST /api/v1/notifications/{id}/read
 *
 * Marque une notification comme lue. Auth requise.
 *
 * Renvoie 404 si l'ID n'appartient pas à l'utilisateur (on ne révèle pas
 * l'existence de notifs d'autres users).
 */

import { z } from "zod";
import { withApi, apiNoContent } from "@infra/api";
import { markNotificationReadService } from "@notifications/public";

const paramsSchema = z.object({
  id: z.string().uuid("L'identifiant doit être un UUID."),
});

export const POST = withApi(
  { authRequired: true, paramsSchema },
  async ({ params, session, requestId }) => {
    await markNotificationReadService(session!.user.id, params.id);
    return apiNoContent({ requestId });
  }
);
