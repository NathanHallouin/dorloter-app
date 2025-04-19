import { api } from "./client";
import { toQuery } from "./qs";
import type { ApiResponse, PageResponse, VetDetail, VetSummary } from "./types";

export const vetsApi = {
  list: (params: { emergency?: boolean; acceptsNac?: boolean; search?: string; cursor?: string } = {}) =>
    api.get<PageResponse<VetSummary>>(`/api/v1/veterinarians${toQuery(params)}`, false),

  get: (slug: string) =>
    api.get<ApiResponse<VetDetail>>(`/api/v1/veterinarians/${slug}`, false).then((r) => r.data),
};
