/**
 * Upload de photos via S3 presigned URL.
 *
 * Flow :
 *   1. presign() → POST /api/v1/uploads/presign (auth)
 *   2. fetch(uploadUrl, PUT, body) → S3 directement (pas de proxy par
 *      notre API → moins de bande passante côté serveur, plus rapide
 *      pour l'utilisateur)
 *   3. retourne `publicUrl` à inclure dans le payload de création
 *
 * Pas de génération de blurDataUrl côté mobile : c'est le serveur qui
 * pourra le faire au moment où la photo est attachée à un report
 * (extension future). Pour le MVP, on poste sans blur — l'image
 * s'affiche sans LQIP, c'est acceptable.
 */

import { api } from "@/lib/api";

type ContentType = "image/jpeg" | "image/png" | "image/webp";

interface UploadInput {
  /** URI local du fichier — fourni par expo-image-picker. */
  fileUri: string;
  contentType: ContentType;
  kind: "report" | "pet" | "shelter" | "pension";
}

interface UploadResult {
  /** URL publique de l'asset, à passer dans le payload de création. */
  publicUrl: string;
  /** Clé S3 — utile pour debug ou DELETE ultérieur. */
  key: string;
}

/**
 * Étape combinée : presign + PUT vers S3.
 *
 * Throws si :
 *   - le presign échoue (401, 429, 500…)
 *   - le PUT S3 échoue (network, signature expirée, etc.)
 */
export async function uploadPhoto({
  fileUri,
  contentType,
  kind,
}: UploadInput): Promise<UploadResult> {
  // 1. Demander une URL signée
  const { data, error } = await api.POST("/uploads/presign", {
    body: { contentType, kind },
  });
  if (error || !data) {
    throw new Error(
      error?.error.message ?? "Présignature S3 indisponible."
    );
  }
  const { uploadUrl, publicUrl, key } = data.data;

  // 2. Upload direct vers S3.
  // RN supporte fetch(file://...) en lecture, on lit le binaire et on
  // l'envoie en PUT. ContentType doit matcher EXACTEMENT celui qu'on a
  // signé sinon la signature S3 est rejetée.
  const fileBlob = await uriToBlob(fileUri);

  const putResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: fileBlob,
  });

  if (!putResponse.ok) {
    throw new Error(
      `Upload S3 échoué (HTTP ${putResponse.status}). Réessayez dans quelques instants.`
    );
  }

  return { publicUrl, key };
}

/**
 * Convertit un URI local (file://...) en Blob — supportée par RN/Expo
 * via `fetch`.
 */
async function uriToBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  return res.blob();
}
