import { api } from "./client";
import type {
  ApiResponse,
  CreateShiftInput,
  CreateVolunteerInput,
  ShiftSignup,
  UpdateShiftInput,
  UpdateSignupInput,
  UpdateVolunteerInput,
  Volunteer,
  VolunteerShift,
} from "./types";

/** Back-office refuge : bénévoles et planning des permanences. */
export const volunteeringApi = {
  listVolunteers: () =>
    api.get<ApiResponse<Volunteer[]>>("/api/v1/shelter/volunteers").then((r) => r.data),
  createVolunteer: (input: CreateVolunteerInput) =>
    api.post<ApiResponse<Volunteer>>("/api/v1/shelter/volunteers", input).then((r) => r.data),
  updateVolunteer: (id: string, input: UpdateVolunteerInput) =>
    api.patch<ApiResponse<Volunteer>>(`/api/v1/shelter/volunteers/${id}`, input).then((r) => r.data),
  removeVolunteer: (id: string) => api.del<void>(`/api/v1/shelter/volunteers/${id}`),

  listShifts: () =>
    api.get<ApiResponse<VolunteerShift[]>>("/api/v1/shelter/shifts").then((r) => r.data),
  createShift: (input: CreateShiftInput) =>
    api.post<ApiResponse<VolunteerShift>>("/api/v1/shelter/shifts", input).then((r) => r.data),
  updateShift: (id: string, input: UpdateShiftInput) =>
    api.patch<ApiResponse<VolunteerShift>>(`/api/v1/shelter/shifts/${id}`, input).then((r) => r.data),
  removeShift: (id: string) => api.del<void>(`/api/v1/shelter/shifts/${id}`),

  listSignups: (shiftId: string) =>
    api.get<ApiResponse<ShiftSignup[]>>(`/api/v1/shelter/shifts/${shiftId}/signups`).then((r) => r.data),
  signup: (shiftId: string, volunteerId: string) =>
    api.post<void>(`/api/v1/shelter/shifts/${shiftId}/signups`, { volunteerId }),
  updateSignup: (id: string, input: UpdateSignupInput) =>
    api.patch<void>(`/api/v1/shelter/signups/${id}`, input),
  removeSignup: (id: string) => api.del<void>(`/api/v1/shelter/signups/${id}`),
};
