import { api } from "./client";
import type { ApiResponse, Notification } from "./types";

export const notificationsApi = {
  list: () =>
    api.get<ApiResponse<Notification[]>>("/api/v1/notifications").then((r) => r.data),

  unreadCount: () =>
    api
      .get<ApiResponse<{ count: number }>>("/api/v1/notifications/unread-count")
      .then((r) => r.data.count),

  markRead: (id: string) => api.post<void>(`/api/v1/notifications/${id}/read`),

  markAllRead: () => api.post<void>("/api/v1/notifications/read-all"),
};
