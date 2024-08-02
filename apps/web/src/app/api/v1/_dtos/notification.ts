/**
 * DTOs notifications — payload API stable pour l'inbox utilisateur.
 */

import type { NotificationItem } from "@notifications/public";

export type NotificationTypeDto =
  | "match_found"
  | "application_update"
  | "new_cat_nearby"
  | "report_nearby"
  | "new_message";

export interface NotificationDto {
  id: string;
  type: NotificationTypeDto;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export function toNotificationDto(item: NotificationItem): NotificationDto {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    body: item.body,
    data: item.data,
    isRead: item.isRead,
    createdAt: item.createdAt.toISOString(),
  };
}
