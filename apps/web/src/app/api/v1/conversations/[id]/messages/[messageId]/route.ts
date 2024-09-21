/**
 * PATCH /api/v1/conversations/{id}/messages/{messageId}
 *
 * Édite le contenu d'un message envoyé par l'utilisateur courant.
 * Fenêtre stricte de 5 minutes après l'envoi (422 sinon).
 * 403 si l'utilisateur n'est pas l'auteur du message.
 *
 * Le serveur publie l'event `message.updated` sur le bus pour que les
 * autres clients de la conversation actualisent leur UI.
 */

import { z } from "zod";
import { withApi, apiOk } from "@infra/api";
import { editMessageService } from "@messaging/public";
import { toMessageApiDto } from "@/app/api/v1/_dtos/conversation";

const paramsSchema = z.object({
  id: z.string().uuid(),
  messageId: z.string().uuid(),
});

const bodySchema = z.object({
  content: z.string().min(1).max(2000),
});

export const PATCH = withApi(
  { authRequired: true, paramsSchema, bodySchema },
  async ({ params, body, session, requestId }) => {
    const dto = await editMessageService(
      {
        userId: session!.user.id,
        userRole: session!.user.role,
        userShelterId: session!.user.shelterId ?? null,
      },
      params.messageId,
      body.content
    );
    return apiOk(toMessageApiDto(dto), { requestId });
  }
);
