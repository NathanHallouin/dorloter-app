import { api } from "./client";
import type { ApiResponse, AdoptionFollowup } from "./types";

/** Back-office refuge : suivi post-adoption (relances J+7 / J+30 / J+90). */
export const followupsApi = {
  list: () =>
    api.get<ApiResponse<AdoptionFollowup[]>>("/api/v1/shelter/followups").then((r) => r.data),
  complete: (id: string, notes?: string) =>
    api
      .post<ApiResponse<AdoptionFollowup>>(`/api/v1/shelter/followups/${id}/complete`, { notes })
      .then((r) => r.data),
  reopen: (id: string) =>
    api.post<ApiResponse<AdoptionFollowup>>(`/api/v1/shelter/followups/${id}/reopen`).then((r) => r.data),
  cancel: (id: string) => api.post<void>(`/api/v1/shelter/followups/${id}/cancel`),
};
