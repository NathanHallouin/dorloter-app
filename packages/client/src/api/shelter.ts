import { api } from "./client";
import type {
  ApiResponse,
  Message,
  ShelterApplication,
  ShelterConversation,
  ShelterPet,
  ShelterTeamMember,
} from "./types";

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
}

export const shelterApi = {
  pets: () =>
    api.get<ApiResponse<ShelterPet[]>>("/api/v1/shelter/pets").then((r) => r.data),

  createPet: (input: ShelterPetInput) =>
    api.post<ApiResponse<ShelterPet>>("/api/v1/shelter/pets", input).then((r) => r.data),

  updatePet: (id: string, input: ShelterPetInput) =>
    api.patch<ApiResponse<ShelterPet>>(`/api/v1/shelter/pets/${id}`, input).then((r) => r.data),

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

  // Réglages back-office
  settings: () =>
    api.get<ApiResponse<{ acceptsFosterApplications: boolean }>>("/api/v1/shelter/settings").then((r) => r.data),

  setFosteringOpen: (acceptsFosterApplications: boolean) =>
    api.patch<ApiResponse<{ acceptsFosterApplications: boolean }>>("/api/v1/shelter/settings", { acceptsFosterApplications }).then((r) => r.data),
};
