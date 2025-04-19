import { api } from "./client";
import { toQuery } from "./qs";
import type {
  ApiResponse,
  Contact,
  PageResponse,
  ReportDetail,
  ReportMatch,
  ReportSummary,
} from "./types";

export interface CreateReportInput {
  type: "perdu" | "trouve";
  species: "chat" | "chien";
  description: string;
  petName?: string;
  breed?: string;
  color?: string;
  sex?: "male" | "femelle" | "inconnu";
  latitude: number;
  longitude: number;
  address?: string;
  dateEvent: string;
  contactPhone?: string;
  contactEmail?: string;
}

export const reportsApi = {
  list: (params: { type?: string; species?: string; sinceDays?: number; cursor?: string; limit?: number } = {}) =>
    api.get<PageResponse<ReportSummary>>(`/api/v1/reports${toQuery(params)}`, false),

  get: (id: string) =>
    api.get<ApiResponse<ReportDetail>>(`/api/v1/reports/${id}`, false).then((r) => r.data),

  matches: (id: string) =>
    api
      .get<ApiResponse<ReportMatch[]>>(`/api/v1/reports/${id}/matches`, false)
      .then((r) => r.data),

  revealContact: (id: string) =>
    api
      .get<ApiResponse<Contact>>(`/api/v1/reports/${id}/reveal-contact`)
      .then((r) => r.data),

  resolve: (id: string) =>
    api.post<ApiResponse<ReportDetail>>(`/api/v1/reports/${id}/resolve`).then((r) => r.data),

  create: (input: CreateReportInput) =>
    api.post<ApiResponse<ReportDetail>>("/api/v1/reports", input).then((r) => r.data),
};
