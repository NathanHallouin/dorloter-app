import { api } from "./client";
import { toQuery } from "./qs";
import type {
  ApiResponse, PageResponse, ShelterDetail, ShelterListItem, ShelterNeed, ShelterPublicEvent,
} from "./types";

export const sheltersApi = {
  list: (params: { search?: string; cursor?: string } = {}) =>
    api.get<PageResponse<ShelterListItem>>(`/api/v1/shelters${toQuery(params)}`, false),

  get: (slug: string) =>
    api.get<ApiResponse<ShelterDetail>>(`/api/v1/shelters/${slug}`, false).then((r) => r.data),

  events: (slug: string) =>
    api.get<ApiResponse<ShelterPublicEvent[]>>(`/api/v1/shelters/${slug}/events`, false).then((r) => r.data),

  needs: (slug: string) =>
    api.get<ApiResponse<ShelterNeed[]>>(`/api/v1/shelters/${slug}/needs`, false).then((r) => r.data),

  applyVolunteer: (id: string, body: { skills?: string; availability?: string; message?: string }) =>
    api.post<ApiResponse<{ ok: boolean }>>(`/api/v1/shelters/${id}/volunteer-applications`, body).then((r) => r.data),

  follow: (id: string) => api.post<void>(`/api/v1/shelters/${id}/follow`),
  unfollow: (id: string) => api.del<void>(`/api/v1/shelters/${id}/follow`),
  myFollowed: () => api.get<ApiResponse<ShelterListItem[]>>("/api/v1/me/shelters").then((r) => r.data),
};
