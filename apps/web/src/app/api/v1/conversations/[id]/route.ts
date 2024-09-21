/**
 * GET    /api/v1/conversations/{id}  — métadonnées
 * DELETE /api/v1/conversations/{id}  — archive (soft) côté appelant
 *
 * GET : refuge (côté user) ou particulier (côté shelter), pet associé,
 * sujet, compteur unread. 404 si l'utilisateur n'a pas accès — pas 403,
 * pour ne pas révéler l'existence d'une conversation à un tiers.
 *
 * DELETE : archive la conversation pour le **côté appelant uniquement**
 * (l'autre côté la voit toujours). Idempotent. La conversation réapparaît
 * dans l'inbox dès qu'un nouveau message arrive (sémantique Slack-like).
 */

import { z } from "zod";
import { withApi, apiOk } from "@infra/api";
import {
  archiveConversationService,
  getConversationContextService,
} from "@messaging/public";
import { toConversationContextDto } from "@/app/api/v1/_dtos/conversation";

const paramsSchema = z.object({
  id: z.string().uuid("L'identifiant doit être un UUID."),
});

export const GET = withApi(
  { authRequired: true, paramsSchema },
  async ({ params, session, requestId }) => {
    const context = await getConversationContextService(
      {
        userId: session!.user.id,
        userRole: session!.user.role,
        userShelterId: session!.user.shelterId ?? null,
      },
      params.id
    );
    return apiOk(toConversationContextDto(context), { requestId });
  }
);

export const DELETE = withApi(
  { authRequired: true, paramsSchema },
  async ({ params, session, requestId }) => {
    const result = await archiveConversationService(
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
