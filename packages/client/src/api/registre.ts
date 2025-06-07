import { api } from "./client";
import type {
  ApiResponse,
  RegistreEntry,
  RegistreStats,
  SetIntakeInput,
  SetOutcomeInput,
} from "./types";

/** Back-office refuge : registre d'entrée/sortie des animaux et statistiques. */
export const registreApi = {
  list: () => api.get<ApiResponse<RegistreEntry[]>>("/api/v1/shelter/registre").then((r) => r.data),
  stats: () => api.get<ApiResponse<RegistreStats>>("/api/v1/shelter/registre/stats").then((r) => r.data),
  setIntake: (petId: string, input: SetIntakeInput) =>
    api.patch<ApiResponse<RegistreEntry>>(`/api/v1/shelter/pets/${petId}/intake`, input).then((r) => r.data),
  setOutcome: (petId: string, input: SetOutcomeInput) =>
    api.patch<ApiResponse<RegistreEntry>>(`/api/v1/shelter/pets/${petId}/outcome`, input).then((r) => r.data),
};
