import { api } from "./client";
import type {
  ApiResponse,
  CreateTemplateInput,
  ResponseTemplate,
  UpdateTemplateInput,
} from "./types";

/** Back-office refuge : modèles de réponses aux candidatures. */
export const templatesApi = {
  list: () =>
    api.get<ApiResponse<ResponseTemplate[]>>("/api/v1/shelter/response-templates").then((r) => r.data),
  create: (input: CreateTemplateInput) =>
    api.post<ApiResponse<ResponseTemplate>>("/api/v1/shelter/response-templates", input).then((r) => r.data),
  update: (id: string, input: UpdateTemplateInput) =>
    api.patch<ApiResponse<ResponseTemplate>>(`/api/v1/shelter/response-templates/${id}`, input).then((r) => r.data),
  remove: (id: string) => api.del<void>(`/api/v1/shelter/response-templates/${id}`),
};

/** Remplace les variables `{{prenomCandidat}}`, `{{nomAnimal}}`, `{{nomRefuge}}` dans un texte. */
export function fillTemplate(
  text: string,
  vars: { prenomCandidat?: string; nomAnimal?: string; nomRefuge?: string },
): string {
  return text
    .replaceAll("{{prenomCandidat}}", vars.prenomCandidat ?? "")
    .replaceAll("{{nomAnimal}}", vars.nomAnimal ?? "")
    .replaceAll("{{nomRefuge}}", vars.nomRefuge ?? "");
}
