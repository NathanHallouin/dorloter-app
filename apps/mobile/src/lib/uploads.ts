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
import { getAuthToken } from "@/lib/auth";

type ImageContentType = "image/jpeg" | "image/png" | "image/webp";
type AudioContentType =
  | "audio/mp4"
  | "audio/mpeg"
  | "audio/aac"
  | "audio/webm";
type ContentType = ImageContentType | AudioContentType;

interface UploadInput {
  /** URI local du fichier — fourni par expo-image-picker ou expo-av. */
  fileUri: string;
  contentType: ContentType;
  kind: "report" | "pet" | "shelter" | "pension" | "voice";
}

interface UploadResult {
  /** URL publique de l'asset, à passer dans le payload de création. */
  publicUrl: string;
  /** Clé S3 — utile pour debug ou DELETE ultérieur. */
  key: string;
}

/** Taille max par fichier — doit matcher MAX_BYTES_BY_KIND côté serveur. */
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Étape combinée : presign + PUT vers S3.
 *
 * Throws si :
 *   - le presign échoue (401, 429, 500…)
 *   - le PUT S3 échoue (network, signature expirée, etc.)
 */
export async function uploadFile({
  fileUri,
  contentType,
  kind,
}: UploadInput): Promise<UploadResult> {
  // 1. Lire le fichier d'abord — on a besoin de sa taille pour la signer.
  const fileBlob = await uriToBlob(fileUri);
  const contentLength = fileBlob.size;

  if (contentLength === 0) {
    throw new Error("Fichier vide ou illisible.");
  }
  if (contentLength > MAX_BYTES) {
    const maxMb = Math.round(MAX_BYTES / (1024 * 1024));
    const sizeMb = (contentLength / (1024 * 1024)).toFixed(1);
    throw new Error(
      `Fichier trop volumineux (${sizeMb} Mo, max ${maxMb} Mo). Compressez l'image avant d'envoyer.`
    );
  }

  // 2. Demander une URL signée — la taille fait partie de la signature.
  const { data, error } = await api.POST("/uploads/presign", {
    body: { contentType, kind, contentLength },
  });
  if (error || !data) {
    throw new Error(
      error?.error.message ?? "Présignature S3 indisponible."
    );
  }
  const { uploadUrl, publicUrl, key } = data.data;

  // 3. Upload direct vers S3. ContentType ET Content-Length doivent
  // matcher EXACTEMENT ce qu'on a signé sinon S3 rejette le PUT.
  const putResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(contentLength),
    },
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

/**
 * Alias historique — ne supporte que les content types image. Conservé
 * pour ne pas casser les callers existants (signaler.tsx).
 */
export async function uploadPhoto(input: {
  fileUri: string;
  contentType: ImageContentType;
  kind: "report" | "pet" | "shelter" | "pension";
}): Promise<UploadResult> {
  return uploadFile(input);
}

/**
 * Upload spécifique pour les messages vocaux — ne passe PAS par un
 * presign + PUT S3 direct, mais par un endpoint Next.js qui reçoit le
 * fichier en multipart et l'upload côté serveur.
 *
 * Pourquoi : en dev local, le bucket MinIO tourne sur `localhost:9000`,
 * pas joignable depuis un device distant. En passant par le serveur
 * (déjà accessible via cloudflared/Metro tunnel), on évite la friction.
 *
 * Retourne `url` qui peut être absolue (S3 public en prod) ou relative
 * (route Next.js qui stream l'audio depuis le bucket). Le composant
 * player préfixe les URL relatives avec l'API base URL.
 */
import Constants from "expo-constants";

export interface VoiceUploadResult {
  url: string;
  key: string;
}

export async function uploadVoice({
  fileUri,
  contentType,
}: {
  fileUri: string;
  contentType: AudioContentType;
}): Promise<VoiceUploadResult> {
  const apiBaseUrl =
    (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
    "http://localhost:3000/api/v1";

  const form = new FormData();
  // RN supporte FormData avec un descripteur { uri, name, type }.
  form.append("file", {
    // @ts-expect-error — RN FormData accepte ce shape, pas le type DOM File
    uri: fileUri,
    name: `voice.${contentType.split("/")[1] ?? "m4a"}`,
    type: contentType,
  });

  const token = await getAuthToken();
  const res = await fetch(`${apiBaseUrl}/uploads/voice`, {
    method: "POST",
    headers: {
      // Pas de Content-Type explicite — fetch RN ajoute le boundary
      // multipart tout seul si on le laisse vide.
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Origin: "dorloter://",
    },
    body: form,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    throw new Error(
      body?.error?.message ?? `Upload audio échoué (HTTP ${res.status}).`
    );
  }

  const json = (await res.json()) as { data: { url: string; key: string } };
  return json.data;
}
