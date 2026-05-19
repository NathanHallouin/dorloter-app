import { api } from "./client";
import type {
  ApiResponse,
  Message,
  PetPhoto,
  ShelterApplication,
  ShelterConversation,
  ShelterDetail,
  ShelterPet,
  ShelterStats,
  ShelterTeamMember,
} from "./types";

/** Champs editables de la fiche publique du refuge (back-office). */
export interface ShelterProfileInput {
  name: string;
  description?: string | null;
  missionLong?: string | null;
  foundedYear?: number | null;
  siret?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  visitHours?: string | null;
  donationUrl?: string | null;
  donationLabel?: string | null;
  donationDescription?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
}

export interface ShelterPetInput {
  name: string;
  species: "chat" | "chien";
  status?: string;
  sex?: string;
  breed?: string;
  color?: string;
  ageCategory?: string;
  description?: string;
  adoptionFee?: number;
  isSterilized?: boolean;
  isChipped?: boolean;
  isVaccinated?: boolean;
  okWithCats?: string;
  okWithDogs?: string;
  okWithChildren?: string;
  specialNeeds?: string;
  /** Chat uniquement (ignoré côté API pour les autres espèces). */
  fivFelv?: string;
  /** Chat uniquement. */
  indoorOnly?: boolean;
}

export const shelterApi = {
  pets: () =>
    api.get<ApiResponse<ShelterPet[]>>("/api/v1/shelter/pets").then((r) => r.data),

  createPet: (input: ShelterPetInput) =>
    api.post<ApiResponse<ShelterPet>>("/api/v1/shelter/pets", input).then((r) => r.data),

  updatePet: (id: string, input: ShelterPetInput) =>
    api.patch<ApiResponse<ShelterPet>>(`/api/v1/shelter/pets/${id}`, input).then((r) => r.data),

  // --- Galerie photo d'un animal ---------------------------------------------

  petPhotos: (petId: string) =>
    api
      .get<ApiResponse<PetPhoto[]>>(`/api/v1/shelter/pets/${petId}/photos`)
      .then((r) => r.data),

  addPetPhoto: (petId: string, url: string, isPrimary?: boolean) =>
    api
      .post<ApiResponse<{ id: string }>>(`/api/v1/shelter/pets/${petId}/photos`, {
        url,
        isPrimary,
      })
      .then((r) => r.data),

  deletePetPhoto: (petId: string, photoId: string) =>
    api.del<void>(`/api/v1/shelter/pets/${petId}/photos/${photoId}`),

  setPrimaryPetPhoto: (petId: string, photoId: string) =>
    api.post<void>(`/api/v1/shelter/pets/${petId}/photos/${photoId}/primary`),

  applications: () =>
    api
      .get<ApiResponse<ShelterApplication[]>>("/api/v1/shelter/applications")
      .then((r) => r.data),

  updateApplication: (id: string, status: string, shelterNotes?: string) =>
    api
      .patch<ApiResponse<ShelterApplication>>(`/api/v1/shelter/applications/${id}`, {
        status,
        shelterNotes,
      })
      .then((r) => r.data),

  conversations: () =>
    api
      .get<ApiResponse<ShelterConversation[]>>("/api/v1/shelter/conversations")
      .then((r) => r.data),

  conversationMessages: (id: string) =>
    api
      .get<ApiResponse<Message[]>>(`/api/v1/shelter/conversations/${id}/messages`)
      .then((r) => r.data),

  sendMessage: (id: string, content: string) =>
    api
      .post<ApiResponse<Message>>(`/api/v1/shelter/conversations/${id}/messages`, { content })
      .then((r) => r.data),

  markConversationRead: (id: string) =>
    api.post<void>(`/api/v1/shelter/conversations/${id}/read`),

  // Équipe (membres + rôles)
  members: () =>
    api.get<ApiResponse<ShelterTeamMember[]>>("/api/v1/shelter/members").then((r) => r.data),

  inviteMember: (email: string, role: string) =>
    api.post<ApiResponse<ShelterTeamMember>>("/api/v1/shelter/members", { email, role }).then((r) => r.data),

  updateMemberRole: (id: string, role: string) =>
    api.patch<ApiResponse<ShelterTeamMember>>(`/api/v1/shelter/members/${id}`, { role }).then((r) => r.data),

  removeMember: (id: string) =>
    api.del<void>(`/api/v1/shelter/members/${id}`),

  // Fiche publique du refuge (back-office)
  profile: () =>
    api.get<ApiResponse<ShelterDetail>>("/api/v1/shelter/profile").then((r) => r.data),

  updateProfile: (input: ShelterProfileInput) =>
    api.patch<ApiResponse<ShelterDetail>>("/api/v1/shelter/profile", input).then((r) => r.data),

  // Réglages back-office
  settings: () =>
    api.get<ApiResponse<{ acceptsFosterApplications: boolean }>>("/api/v1/shelter/settings").then((r) => r.data),

  setFosteringOpen: (acceptsFosterApplications: boolean) =>
    api.patch<ApiResponse<{ acceptsFosterApplications: boolean }>>("/api/v1/shelter/settings", { acceptsFosterApplications }).then((r) => r.data),

  // Statistiques avancées (aide à la décision)
  stats: () =>
    api.get<ApiResponse<ShelterStats>>("/api/v1/shelter/stats").then((r) => r.data),
};
