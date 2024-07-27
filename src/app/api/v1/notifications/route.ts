/**
 * GET /api/v1/notifications
 *
 * Inbox de l'utilisateur courant. Tri par date décroissante. Cursor-based.
 *
 * Réponse non-standard : on inclut `unreadCount` dans la pagination pour
 * que le client n'ait pas à faire un round-trip supplémentaire pour le
 * badge — toujours frais, indépendant du filtre `unreadOnly`.
 *
 * Auth requise.
 */

import { z } from "zod";
import { NextResponse } from "next/server";
import { withApi } from "@infra/api";
import { listUserNotificationsService } from "@notifications/public";
import { toNotificationDto } from "@/app/api/v1/_dtos/notification";

const querySchema = z.object({
  unreadOnly: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
  cursor: z.string().min(1).max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const GET = withApi(
  { authRequired: true, querySchema },
  async ({ query, session, requestId }) => {
    const result = await listUserNotificationsService({
      userId: session!.user.id,
      filters: { unreadOnly: query.unreadOnly },
      cursor: query.cursor ?? null,
      limit: query.limit,
    });

    return NextResponse.json(
      {
        data: result.notifications.map(toNotificationDto),
        pagination: {
          cursor: result.nextCursor,
          hasMore: result.nextCursor !== null,
        },
        unreadCount: result.unreadCount,
      },
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
