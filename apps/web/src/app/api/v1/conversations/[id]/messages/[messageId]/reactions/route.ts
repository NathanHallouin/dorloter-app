/**
 * POST /api/v1/conversations/{id}/messages/{messageId}/reactions
 *
 * Toggle une réaction emoji sur un message (idempotent : 2e POST sur le
 * même emoji = retrait). Rate-limité 60 reactions/min/user.
 *
 * Body : `{ emoji: "❤️" }`. La liste blanche est fixée côté serveur
 * (cf. `apps/web/src/domains/messaging/emojis.ts`) ; un emoji hors liste
 * retourne 400.
 *
 * Retourne `{ added: boolean, reactions: ReactionAgg[] }` — agrégation
 * fraîche du message après le toggle pour patch direct côté client.
 */

import { z } from "zod";
import { withApi, apiOk } from "@infra/api";
import { toggleReactionService } from "@messaging/public";

const paramsSchema = z.object({
  id: z.string().uuid(),
  messageId: z.string().uuid(),
});

const bodySchema = z.object({
  emoji: z.string().min(1).max(10),
});

export const POST = withApi(
  { authRequired: true, paramsSchema, bodySchema },
  async ({ params, body, session, requestId }) => {
    const result = await toggleReactionService(
      {
        userId: session!.user.id,
        userRole: session!.user.role,
        userShelterId: session!.user.shelterId ?? null,
      },
      params.messageId,
      body.emoji
    );
    return apiOk(result, { requestId });
  }
);
