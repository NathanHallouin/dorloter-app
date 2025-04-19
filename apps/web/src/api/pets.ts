import { api } from "./client";
import { toQuery } from "./qs";
import type { ApiResponse, PageResponse, Pet, PetSummary } from "./types";

export interface PetFilters {
  species?: string;
  sex?: string;
  ageCategory?: string;
  okWithCats?: boolean;
  okWithDogs?: boolean;
  okWithChildren?: boolean;
  shelterId?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export const petsApi = {
  list: (filters: PetFilters = {}) =>
    api.get<PageResponse<PetSummary>>(`/api/v1/pets${toQuery(filters)}`, false),

  get: (id: string) =>
    api.get<ApiResponse<Pet>>(`/api/v1/pets/${id}`, false).then((r) => r.data),
};
