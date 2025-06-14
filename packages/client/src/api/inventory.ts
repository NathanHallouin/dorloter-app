import { api } from "./client";
import type {
  ApiResponse,
  CreateInventoryItemInput,
  InventoryItem,
  UpdateInventoryItemInput,
} from "./types";

/** Back-office refuge : stock et besoins (inventaire). */
export const inventoryApi = {
  list: () => api.get<ApiResponse<InventoryItem[]>>("/api/v1/shelter/inventory").then((r) => r.data),
  create: (input: CreateInventoryItemInput) =>
    api.post<ApiResponse<InventoryItem>>("/api/v1/shelter/inventory", input).then((r) => r.data),
  update: (id: string, input: UpdateInventoryItemInput) =>
    api.patch<ApiResponse<InventoryItem>>(`/api/v1/shelter/inventory/${id}`, input).then((r) => r.data),
  adjust: (id: string, delta: number) =>
    api.post<ApiResponse<InventoryItem>>(`/api/v1/shelter/inventory/${id}/adjust`, { delta }).then((r) => r.data),
  remove: (id: string) => api.del<void>(`/api/v1/shelter/inventory/${id}`),
};
