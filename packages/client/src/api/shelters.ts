import { api } from "./client";
import { toQuery } from "./qs";
import type { ApiResponse, PageResponse, ShelterDetail, ShelterListItem } from "./types";

export const sheltersApi = {
  list: (params: { search?: string; cursor?: string } = {}) =>
    api.get<PageResponse<ShelterListItem>>(`/api/v1/shelters${toQuery(params)}`, false),

  get: (slug: string) =>
    api.get<ApiResponse<ShelterDetail>>(`/api/v1/shelters/${slug}`, false).then((r) => r.data),

  follow: (id: string) => api.post<void>(`/api/v1/shelters/${id}/follow`),
  unfollow: (id: string) => api.del<void>(`/api/v1/shelters/${id}/follow`),
  myFollowed: () => api.get<ApiResponse<ShelterListItem[]>>("/api/v1/me/shelters").then((r) => r.data),
};
