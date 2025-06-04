import { api } from "./client";
import type {
  ApiResponse,
  CreateHealthEventInput,
  HealthEvent,
  UpcomingHealth,
  UpdateHealthEventInput,
} from "./types";

/** Back-office refuge : suivi médical et sanitaire des animaux. */
export const healthApi = {
  listForPet: (petId: string) =>
    api.get<ApiResponse<HealthEvent[]>>(`/api/v1/shelter/pets/${petId}/health`).then((r) => r.data),

  create: (petId: string, input: CreateHealthEventInput) =>
    api.post<ApiResponse<HealthEvent>>(`/api/v1/shelter/pets/${petId}/health`, input).then((r) => r.data),

  upcoming: (days = 60) =>
    api.get<ApiResponse<UpcomingHealth[]>>(`/api/v1/shelter/health/upcoming?days=${days}`).then((r) => r.data),

  update: (id: string, input: UpdateHealthEventInput) =>
    api.patch<ApiResponse<HealthEvent>>(`/api/v1/shelter/health/${id}`, input).then((r) => r.data),

  remove: (id: string) => api.del<void>(`/api/v1/shelter/health/${id}`),
};
