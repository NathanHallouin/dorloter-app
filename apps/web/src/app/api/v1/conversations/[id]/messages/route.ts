/**
 * GET  /api/v1/conversations/{id}/messages
 *   - sans param  : tous les messages (max 200, ordre chronologique)
 *   - `?since=ISO`: uniquement les messages strictement postérieurs (polling)
 *
 * POST /api/v1/conversations/{id}/messages — envoie un message
 *
 * Le polling toutes les ~5s avec `since` est la stratégie mobile par défaut
 * (le SSE n'est pas pratique en RN/native). Le serveur publie aussi sur le
 * bus interne pour les clients SSE web.
 */

import { z } from "zod";
import { withApi, apiOk, apiCreated } from "@infra/api";
import {
  getMessagesService,
  sendMessageService,
} from "@messaging/public";
import { toMessageApiDto } from "@/app/api/v1/_dtos/conversation";

const paramsSchema = z.object({
  id: z.string().uuid("L'identifiant doit être un UUID."),
});

const listQuerySchema = z.object({
  since: z
    .string()
    .datetime({ message: "since doit être une date ISO 8601." })
    .optional(),
});

export const GET = withApi(
  { authRequired: true, paramsSchema, querySchema: listQuerySchema },
  async ({ params, query, session, requestId }) => {
    const messages = await getMessagesService(
      {
        userId: session!.user.id,
        userRole: session!.user.role,
        userShelterId: session!.user.shelterId ?? null,
      },
      params.id,
      { since: query.since ? new Date(query.since) : undefined }
    );

    return apiOk(messages.map(toMessageApiDto), { requestId });
  }
);

const gifMetaSchema = z.object({
  type: z.literal("gif"),
  provider: z.literal("tenor"),
  externalId: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  previewUrl: z.string().url(),
});

const voiceMetaSchema = z.object({
  type: z.literal("voice"),
  durationMs: z.number().int().min(200).max(5 * 60 * 1000),
  mimeType: z.string().max(120),
});

const attachmentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("gif"),
    url: z.string().url().max(2048),
    meta: gifMetaSchema,
  }),
  z.object({
    type: z.literal("voice"),
    url: z.string().url().max(2048),
    meta: voiceMetaSchema,
  }),
]);

const sendBodySchema = z
  .object({
    content: z.string().max(2000).optional(),
    attachment: attachmentSchema.optional(),
  })
  .refine(
    (v) => (v.content && v.content.trim().length > 0) || v.attachment,
    { message: "Message vide — fournir `content` et/ou `attachment`." }
  );

export const POST = withApi(
  { authRequired: true, paramsSchema, bodySchema: sendBodySchema },
  async ({ params, body, session, requestId }) => {
    const result = await sendMessageService(
      {
        userId: session!.user.id,
        userRole: session!.user.role,
        userShelterId: session!.user.shelterId ?? null,
      },
      params.id,
      { content: body.content, attachment: body.attachment }
    );
    return apiCreated(result, { requestId });
  }
);
