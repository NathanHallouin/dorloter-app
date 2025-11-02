import { api } from "./client";
import { toQuery } from "./qs";
import type {
  ApiResponse,
  CalendarEvent,
  CreateEventInput,
  EventSignup,
  PageResponse,
  ShelterEvent,
  UpdateEventInput,
} from "./types";

/** Filtres du calendrier public d'événements. */
export interface CalendarFilters {
  type?: string;
  /** Borne basse (yyyy-mm-dd) · défaut : à venir. */
  from?: string;
  /** Borne haute (yyyy-mm-dd). */
  to?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  cursor?: string;
  limit?: number;
}

/** Public : calendrier des événements adoption (tous refuges). */
export const publicEventsApi = {
  list: (filters: CalendarFilters = {}) =>
    api.get<PageResponse<CalendarEvent>>(`/api/v1/events${toQuery(filters)}`, false),
};

/** Back-office refuge : événements et opérations terrain (collectes, journées d'adoption...). */
export const eventsApi = {
  list: () => api.get<ApiResponse<ShelterEvent[]>>("/api/v1/shelter/events").then((r) => r.data),
  create: (input: CreateEventInput) =>
    api.post<ApiResponse<ShelterEvent>>("/api/v1/shelter/events", input).then((r) => r.data),
  update: (id: string, input: UpdateEventInput) =>
    api.patch<ApiResponse<ShelterEvent>>(`/api/v1/shelter/events/${id}`, input).then((r) => r.data),
  remove: (id: string) => api.del<void>(`/api/v1/shelter/events/${id}`),

  listSignups: (eventId: string) =>
    api.get<ApiResponse<EventSignup[]>>(`/api/v1/shelter/events/${eventId}/signups`).then((r) => r.data),
  signup: (eventId: string, volunteerId: string) =>
    api.post<void>(`/api/v1/shelter/events/${eventId}/signups`, { volunteerId }),
  updateSignup: (id: string, status: string) =>
    api.patch<void>(`/api/v1/shelter/event-signups/${id}`, { status }),
  removeSignup: (id: string) => api.del<void>(`/api/v1/shelter/event-signups/${id}`),
};
