import { api } from "./client";
import type { ApiResponse, Conversation, Message } from "./types";

export const messagingApi = {
  conversations: () =>
    api.get<ApiResponse<Conversation[]>>("/api/v1/conversations").then((r) => r.data),

  open: (input: { shelterId: string; petId?: string; subject?: string }) =>
    api
      .post<ApiResponse<Conversation>>("/api/v1/conversations", input)
      .then((r) => r.data),

  messages: (conversationId: string) =>
    api
      .get<ApiResponse<Message[]>>(`/api/v1/conversations/${conversationId}/messages`)
      .then((r) => r.data),

  send: (conversationId: string, content: string) =>
    api
      .post<ApiResponse<Message>>(
        `/api/v1/conversations/${conversationId}/messages`,
        { content },
      )
      .then((r) => r.data),

  markRead: (conversationId: string) =>
    api.post<void>(`/api/v1/conversations/${conversationId}/read`),

  unreadCount: () =>
    api
      .get<ApiResponse<{ count: number }>>("/api/v1/conversations/unread-count")
      .then((r) => r.data.count),
};
