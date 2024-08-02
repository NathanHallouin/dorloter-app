/**
 * DELETE /api/v1/devices/{id}
 *
 * Retire un device token enregistré — appelé typiquement à la
 * déconnexion mobile pour ne plus recevoir de push.
 *
 * Auth requise. Renvoie 404 si le device n'existe pas ou n'appartient
 * pas à l'utilisateur (pas de fuite d'info sur les devices d'autres
 * users).
 */

import { z } from "zod";
import { withApi, apiNoContent } from "@infra/api";
import { unregisterDeviceService } from "@notifications/public";

const paramsSchema = z.object({
  id: z.string().uuid("L'identifiant doit être un UUID."),
});

export const DELETE = withApi(
  { authRequired: true, paramsSchema },
  async ({ params, session, requestId }) => {
    await unregisterDeviceService(session!.user.id, params.id);
    return apiNoContent({ requestId });
  }
);
