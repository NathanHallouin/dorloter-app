import { db } from "@infra/db";
import { notifications } from "@/server/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

interface NotificationListFilters {
  /** Si true, ne retourne que les non lues. Si undefined, tout. */
  unreadOnly?: boolean;
}

export async function getUserNotifications(
  userId: string,
  limit = 50,
  offset = 0,
  filters: NotificationListFilters = {}
) {
  const conditions = [eq(notifications.userId, userId)];
  if (filters.unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }

  return db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
  return Number(row?.count ?? 0);
}
