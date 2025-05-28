import { api } from "./client";
import type {
  ApiResponse,
  Contract,
  ContractStatus,
  CreateAdoptionContractInput,
  CreateFosterContractInput,
  UpdateContractInput,
} from "./types";

const BASE = "/api/v1/shelter/contracts";

/** Back-office refuge : contrats d'adoption et conventions de famille d'accueil. */
export const contractsApi = {
  list: () => api.get<ApiResponse<Contract[]>>(BASE).then((r) => r.data),

  get: (id: string) =>
    api.get<ApiResponse<Contract>>(`${BASE}/${id}`).then((r) => r.data),

  createAdoption: (input: CreateAdoptionContractInput) =>
    api.post<ApiResponse<Contract>>(`${BASE}/adoption`, input).then((r) => r.data),

  createFoster: (input: CreateFosterContractInput) =>
    api.post<ApiResponse<Contract>>(`${BASE}/foster`, input).then((r) => r.data),

  update: (id: string, input: UpdateContractInput) =>
    api.patch<ApiResponse<Contract>>(`${BASE}/${id}`, input).then((r) => r.data),

  setStatus: (id: string, status: ContractStatus) =>
    api.post<ApiResponse<Contract>>(`${BASE}/${id}/status`, { status }).then((r) => r.data),
};
