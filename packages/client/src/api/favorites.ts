import { api } from "./client";
import type { ApiResponse, PetSummary } from "./types";

export const favoritesApi = {
  add: (petId: string) => api.post<void>("/api/v1/favorites", { petId }),

  remove: (petId: string) => api.del<void>(`/api/v1/favorites/${petId}`),

  mine: () =>
    api.get<ApiResponse<PetSummary[]>>("/api/v1/me/favorites").then((r) => r.data),
};
