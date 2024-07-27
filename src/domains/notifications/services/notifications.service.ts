/**
 * Service notifications — logique métier pure (pas de revalidatePath).
 *
 * Voir docs/SERVICES-API.md pour la convention.
 *
 * Cursor-based pagination sur `(createdAt DESC, id DESC)` : la composante
 * `id` casse les égalités quand deux notifications partagent un timestamp.
 */

import { and, eq, lt, or, sql } from "drizzle-orm";
import { db } from "@infra/db";
import { notFound, validationFailed } from "@infra/api/errors";
import { decodeCursor, encodeCursor } from "@infra/api/cursor";
import { notifications } from "@/server/db/schema";
import type { NotificationType } from "../preferences";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: Date;
}

export interface NotificationListFilters {
  /** Si true, ne retourne que les non lues. */
  unreadOnly?: boolean;
}

export interface NotificationListResult {
  notifications: NotificationItem[];
  unreadCount: number;
  nextCursor: string | null;
}

interface CursorPayload {
  /** ISO de createdAt. */
  ts: string;
  id: string;
}

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listUserNotifications(options: {
  userId: string;
  filters?: NotificationListFilters;
  cursor?: string | null;
  limit?: number;
}): Promise<NotificationListResult> {
  const { userId } = options;
  const filters = options.filters ?? {};
  const limit = clampLimit(options.limit);

  const conditions = [eq(notifications.userId, userId)];
  if (filters.unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }

  if (options.cursor) {
    const cursor = decodeCursor<CursorPayload>(options.cursor);
    if (!cursor || !cursor.ts || !cursor.id) {
      throw validationFailed("Cursor invalide.");
    }
    const cursorTs = new Date(cursor.ts);
    if (Number.isNaN(cursorTs.getTime())) {
      throw validationFailed("Cursor invalide (ts).");
    }
    // (createdAt < ts) OU (createdAt = ts AND id < cursorId)
    conditions.push(
      or(
        lt(notifications.createdAt, cursorTs),
        and(
          eq(notifications.createdAt, cursorTs),
          lt(notifications.id, cursor.id)
        )
      )!
    );
  }

  const rows = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(
      sql`${notifications.createdAt} desc`,
      sql`${notifications.id} desc`
    )
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const nextCursor = hasMore
    ? encodeCursor<CursorPayload>({
        ts: page[page.length - 1]!.createdAt.toISOString(),
        id: page[page.length - 1]!.id,
      })
    : null;

  // Compteur global non lu — toujours retourné, indépendant du filtre
  // pour que le client ait toujours le badge à jour.
  const [unreadRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );

  return {
    notifications: page.map(toNotificationItem),
    unreadCount: Number(unreadRow?.count ?? 0),
    nextCursor,
  };
}

export async function countUnreadNotifications(
  userId: string
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
  return Number(row?.count ?? 0);
}

export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<void> {
  if (!UUID_RE.test(notificationId)) {
    throw validationFailed("ID de notification invalide.");
  }
  const result = await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      )
    )
    .returning({ id: notifications.id });

  if (result.length === 0) {
    // Soit n'existe pas, soit pas à cet user — on renvoie 404 dans les
    // deux cas pour ne pas leak l'existence de notifs d'autres users.
    throw notFound("Notification", notificationId);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function clampLimit(limit: number | undefined): number {
  if (!limit) return DEFAULT_LIMIT;
  if (limit < 1) return 1;
  if (limit > MAX_LIMIT) return MAX_LIMIT;
  return Math.floor(limit);
}

function toNotificationItem(row: {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: unknown;
  isRead: boolean;
  createdAt: Date;
}): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: (row.data as Record<string, unknown> | null) ?? null,
    isRead: row.isRead,
    createdAt: row.createdAt,
  };
}
