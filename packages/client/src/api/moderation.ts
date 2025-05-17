import { api } from "./client";
import type { ApiResponse, ContentReport } from "./types";

export const moderationApi = {
  listPending: () => api.get<ApiResponse<ContentReport[]>>("/api/v1/moderation/reports").then((r) => r.data),

  resolve: (id: string, status: "masque" | "rejete") =>
    api.post<ApiResponse<ContentReport>>(`/api/v1/moderation/reports/${id}/resolve`, { status }).then((r) => r.data),

  submit: (contentType: string, contentId: string, reason: string, comment?: string) =>
    api.post<ApiResponse<ContentReport>>("/api/v1/moderation/reports", { contentType, contentId, reason, comment }).then((r) => r.data),
};
