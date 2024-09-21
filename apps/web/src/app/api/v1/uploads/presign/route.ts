/**
 * POST /api/v1/uploads/presign
 *
 * Génère une URL S3 signée pour permettre à un client (mobile, mais
 * utilisable depuis n'importe où) d'uploader un fichier directement vers
 * notre bucket sans passer par notre API.
 *
 * Flow attendu :
 *   1. Client → POST /uploads/presign  { contentType, contentLength, kind }
 *   2. Serveur → { uploadUrl, publicUrl, key, expiresInSec, maxBytes }
 *   3. Client → PUT uploadUrl avec le body fichier (headers Content-Type
 *      ET Content-Length identiques à ceux passés en (1))
 *   4. Client utilise `publicUrl` dans son payload de création (POST
 *      /reports, /pets/photos, …)
 *
 * Sécurité (défense en profondeur — voir docs/DEPLOYMENT-PROTOTYPE.md) :
 *   - Auth requise — pas d'upload anonyme.
 *   - Quota strict par utilisateur : 50 presigns/jour/user. Un compte
 *     compromis ne peut donc pas saturer le bucket en quelques minutes.
 *   - Taille max par fichier appliquée dans la signature S3 (le PUT est
 *     refusé par S3 si le client triche sur Content-Length).
 *   - Le `kind` préfixe la clé S3 (`reports/<userId>/...`), utilisé
 *     ensuite par les politiques CORS / lifecycle.
 *   - **Pas** de NSFW check au presign — il sera fait au moment de
 *     l'attache à un report/pet (ou skip pour le MVP, modération
 *     communautaire en filet).
 *   - L'URL signée expire en 5 min : assez pour uploader, court assez
 *     pour limiter le risque d'interception.
 */

import { z } from "zod";
import { withApi, apiOk } from "@infra/api";
import { unprocessable } from "@infra/api/errors";
import { consumeRateLimit } from "@infra/rate-limit";
import { getPresignedUploadUrl } from "@infra/storage/s3";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  // Audio pour les messages vocaux : m4a (iOS/Android natif), webm (web
  // MediaRecorder), mp3 et aac pour la souplesse.
  "audio/mp4",
  "audio/mpeg",
  "audio/aac",
  "audio/webm",
] as const;

type ContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

const KIND_PREFIXES = {
  report: "reports",
  pet: "pets",
  shelter: "shelters",
  pension: "pensions",
  voice: "messages/voice",
} as const;

const bodySchema = z.object({
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  kind: z.enum(["report", "pet", "shelter", "pension", "voice"]),
  /** Taille du fichier en octets. Sert à signer un PUT contraint sur S3. */
  contentLength: z.number().int().positive(),
});

const EXPIRES_IN_SEC = 300; // 5 minutes — trade-off upload time / risk
const PUBLIC_URL_BASE = process.env.S3_PUBLIC_URL ?? "";

/** Quota par utilisateur — empêche un compte de pourrir le bucket en masse. */
const DAILY_PRESIGN_LIMIT = 50;
const ONE_DAY_SEC = 24 * 60 * 60;

/**
 * Taille max par type d'asset. Appliquée dans la signature S3 (PUT
 * refusé si Content-Length diverge) ET côté client pour l'UX.
 */
const MAX_BYTES_BY_KIND: Record<
  "report" | "pet" | "shelter" | "pension" | "voice",
  number
> = {
  report: 5 * 1024 * 1024,
  pet: 5 * 1024 * 1024,
  shelter: 5 * 1024 * 1024,
  pension: 5 * 1024 * 1024,
  voice: 5 * 1024 * 1024,
};

function extensionFor(
  ct: ContentType
): "jpg" | "png" | "webp" | "m4a" | "mp3" | "aac" | "webm" {
  switch (ct) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "audio/mp4":
      return "m4a";
    case "audio/mpeg":
      return "mp3";
    case "audio/aac":
      return "aac";
    case "audio/webm":
      return "webm";
  }
}

export const POST = withApi(
  {
    authRequired: true,
    bodySchema,
  },
  async ({ body, session, requestId }) => {
    const userId = session!.user.id;

    // Quota par utilisateur — 50 presigns/jour. Le bucket sur les paliers
    // gratuits Scaleway (75 Go) est dimensionné en supposant que personne
    // ne génère plus de ~250 Mo/jour, ce qui laisse une marge confortable.
    const rl = await consumeRateLimit({
      key: `api:uploads:presign:user:${userId}`,
      limit: DAILY_PRESIGN_LIMIT,
      windowSec: ONE_DAY_SEC,
    });
    if (!rl.ok) {
      throw unprocessable(
        `Quota d'upload quotidien atteint (${DAILY_PRESIGN_LIMIT} fichiers/jour). Réessayez demain.`,
        { retryAfter: rl.retryAfter }
      );
    }

    const maxBytes = MAX_BYTES_BY_KIND[body.kind];
    if (body.contentLength > maxBytes) {
      const maxMb = Math.round(maxBytes / (1024 * 1024));
      throw unprocessable(
        `Fichier trop volumineux (max ${maxMb} Mo).`,
        { size: body.contentLength, maxBytes }
      );
    }

    const ext = extensionFor(body.contentType);
    const prefix = KIND_PREFIXES[body.kind];
    const key = `${prefix}/${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    // Signer en incluant Content-Length : S3 refuse le PUT si le client
    // envoie un fichier d'une autre taille. Empêche le bypass du quota.
    const uploadUrl = await getPresignedUploadUrl(
      key,
      body.contentType,
      EXPIRES_IN_SEC,
      body.contentLength
    );
    const publicUrl = `${PUBLIC_URL_BASE}/${key}`;

    return apiOk(
      {
        uploadUrl,
        publicUrl,
        key,
        expiresInSec: EXPIRES_IN_SEC,
        maxBytes,
      },
      { requestId }
    );
  }
);
