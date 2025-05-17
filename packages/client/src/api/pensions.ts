import { api } from "./client";
import { toQuery } from "./qs";
import type { ApiResponse, Booking, CreateBookingInput, PageResponse, PensionDetail, PensionSummary } from "./types";

export const pensionsApi = {
  list: (params: { acceptsCats?: boolean; acceptsDogs?: boolean; search?: string; cursor?: string } = {}) =>
    api.get<PageResponse<PensionSummary>>(`/api/v1/pensions${toQuery(params)}`, false),

  get: (slug: string) =>
    api.get<ApiResponse<PensionDetail>>(`/api/v1/pensions/${slug}`, false).then((r) => r.data),

  book: (id: string, input: CreateBookingInput) =>
    api.post<ApiResponse<Booking>>(`/api/v1/pensions/${id}/bookings`, input).then((r) => r.data),

  myBookings: () => api.get<ApiResponse<Booking[]>>("/api/v1/me/bookings").then((r) => r.data),

  // Back-office pension (pension_admin)
  adminBookings: () => api.get<ApiResponse<Booking[]>>("/api/v1/pension/bookings").then((r) => r.data),
  setBookingStatus: (id: string, status: string) =>
    api.patch<ApiResponse<Booking>>(`/api/v1/pension/bookings/${id}`, { status }).then((r) => r.data),
};
