import { api } from "./client";
import type { ApiResponse, FosterFamily, FosterPrefsInput, MyFostership } from "./types";

/** Côté refuge (back-office). */
export const fosterApi = {
  list: () =>
    api.get<ApiResponse<FosterFamily[]>>("/api/v1/shelter/fosters").then((r) => r.data),

  invite: (email: string) =>
    api.post<void>("/api/v1/shelter/fosters", { email }),

  respondToRequest: (id: string, accept: boolean) =>
    api.post<void>(`/api/v1/shelter/fosters/${id}/respond`, { accept }),

  end: (id: string) =>
    api.post<void>(`/api/v1/shelter/fosters/${id}/end`, {}),

  placePet: (familyId: string, petId: string) =>
    api.post<void>(`/api/v1/shelter/fosters/${familyId}/placements`, { petId }),

  endPlacement: (placementId: string) =>
    api.post<void>(`/api/v1/shelter/fosters/placements/${placementId}/end`, {}),
};

/** Côté utilisateur (famille d'accueil). */
export const myFosterApi = {
  list: () =>
    api.get<ApiResponse<MyFostership[]>>("/api/v1/me/fosterships").then((r) => r.data),

  request: (shelterId: string, prefs: FosterPrefsInput) =>
    api.post<void>("/api/v1/me/fosterships", { shelterId, ...prefs }),

  respondToInvitation: (id: string, accept: boolean, prefs?: FosterPrefsInput) =>
    api.post<void>(`/api/v1/me/fosterships/${id}/respond`, { accept, ...(prefs ?? {}) }),
};
