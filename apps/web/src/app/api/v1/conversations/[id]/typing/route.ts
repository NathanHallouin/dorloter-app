/**
 * GET  /api/v1/conversations/{id}/typing  — liste des autres participants
 *                                            en train d'écrire (TTL 5s).
 * POST /api/v1/conversations/{id}/typing  — body `{ isTyping }` : déclare
 *                                            que l'appelant tape (ou pas).
 *
 * Le suivi est in-memory côté serveur (5s d'expiration). Pour scaler
 * horizontalement, migrer le `typingMap` vers Redis.
 *
 * Côté client : envoyer `POST { isTyping: true }` toutes les ~3s tant
 * que l'utilisateur tape (l'entrée expire à 5s côté serveur), envoyer
 * `false` quand il s'arrête. Le destinataire poll `GET` toutes les 2s
 * et affiche un indicateur "en train d'écrire".
 */

import { z } from "zod";
import { withApi, apiOk } from "@infra/api";
import { getTypingService, setTypingService } from "@messaging/public";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const bodySchema = z.object({
  isTyping: z.boolean(),
});

export const GET = withApi(
  { authRequired: true, paramsSchema },
  async ({ params, session, requestId }) => {
    const result = await getTypingService(
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

export const POST = withApi(
  { authRequired: true, paramsSchema, bodySchema },
  async ({ params, body, session, requestId }) => {
    const result = await setTypingService(
      {
        userId: session!.user.id,
        userRole: session!.user.role,
        userShelterId: session!.user.shelterId ?? null,
      },
      params.id,
      body.isTyping
    );
    return apiOk(result, { requestId });
  }
);
