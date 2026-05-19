import { api } from "./client";
import type { ApiResponse, PresignResult, UploadKind } from "./types";

/** Types MIME acceptés par le serveur pour une image. */
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const uploadsApi = {
  presign: (contentType: string, kind: UploadKind, contentLength: number) =>
    api
      .post<ApiResponse<PresignResult>>("/api/v1/uploads/presign", {
        contentType,
        kind,
        contentLength,
      })
      .then((r) => r.data),

  /**
   * Dépose un fichier et renvoie son URL publique.
   *
   * Le binaire va directement au stockage objet, sans passer par l'API. Le
   * `Content-Type` doit être exactement celui présigné, sinon la signature est
   * rejetée. `Content-Length` est posé automatiquement par le navigateur à
   * partir du fichier : il correspond donc forcément à la taille annoncée.
   */
  uploadFile: async (file: File, kind: UploadKind): Promise<string> => {
    if (!IMAGE_TYPES.includes(file.type)) {
      throw new Error("Format non accepté. Utilisez JPEG, PNG ou WebP.");
    }
    const presigned = await uploadsApi.presign(file.type, kind, file.size);

    const response = await fetch(presigned.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!response.ok) {
      throw new Error("L'envoi du fichier a échoué. Réessayez dans un instant.");
    }
    return presigned.publicUrl;
  },
};
