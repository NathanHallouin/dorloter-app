import { api } from "./client";
import type { Application, ApiResponse } from "./types";

export interface CreateApplicationInput {
  petId: string;
  motivation: string;
  housingType?: string;
  hasOutdoorAccess?: boolean;
  experience?: string;
  availability?: string;
}

export const applicationsApi = {
  create: (input: CreateApplicationInput) =>
    api
      .post<ApiResponse<Application>>("/api/v1/applications", input)
      .then((r) => r.data),

  mine: () =>
    api.get<ApiResponse<Application[]>>("/api/v1/me/applications").then((r) => r.data),
};
