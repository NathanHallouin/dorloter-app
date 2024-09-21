/**
 * GET  /api/v1/conversations  — inbox de l'utilisateur courant
 * POST /api/v1/conversations  — ouvre une conversation (idempotent par (user, shelter, pet))
 *
 * Le paramètre `?side=shelter` permet à un shelter_admin de récupérer
 * l'inbox de son refuge. Par défaut, mode particulier.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi, apiCreated } from "@infra/api";
import {
  listInboxService,
  openConversationService,
} from "@messaging/public";
import {
  toUserInboxDto,
  toShelterInboxDto,
  type InboxItemDto,
} from "@/app/api/v1/_dtos/conversation";

const listQuerySchema = z.object({
  side: z.enum(["user", "shelter"]).optional(),
});

export const GET = withApi(
  { authRequired: true, querySchema: listQuerySchema },
  async ({ query, session, requestId }) => {
    const side = query.side ?? "user";
    const rows = await listInboxService(
      {
        userId: session!.user.id,
        userRole: session!.user.role,
        userShelterId: session!.user.shelterId ?? null,
      },
      side
    );
    const items: InboxItemDto[] =
      side === "user"
        ? rows.map((r) => toUserInboxDto(r as never))
        : rows.map((r) => toShelterInboxDto(r as never));

    return NextResponse.json(
      { data: items },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "X-Request-Id": requestId,
        },
      }
    );
  }
);

const openBodySchema = z.object({
  shelterId: z.string().uuid("L'identifiant du refuge doit être un UUID."),
  petId: z
    .string()
    .uuid("L'identifiant de l'animal doit être un UUID.")
    .optional(),
  firstMessage: z
    .string()
    .min(10, "Le message doit faire au moins 10 caractères.")
    .max(2000, "Le message ne peut pas dépasser 2000 caractères."),
});

export const POST = withApi(
  { authRequired: true, bodySchema: openBodySchema },
  async ({ body, session, requestId }) => {
    const result = await openConversationService(session!.user.id, {
      shelterId: body.shelterId,
      petId: body.petId ?? null,
      firstMessage: body.firstMessage,
    });
    return apiCreated(result, { requestId });
  }
);
