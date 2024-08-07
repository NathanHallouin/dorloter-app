/**
 * POST /api/v1/uploads/presign
 *
 * Génère une URL S3 signée pour permettre à un client (mobile, mais
 * utilisable depuis n'importe où) d'uploader un fichier directement vers
 * notre bucket sans passer par notre API.
 *
 * Flow attendu :
 *   1. Client → POST /uploads/presign  { contentType, kind }
 *   2. Serveur → { uploadUrl, publicUrl, key, expiresInSec }
 *   3. Client → PUT uploadUrl avec le body fichier (header Content-Type
 *      identique à celui passé en (1))
 *   4. Client utilise `publicUrl` dans son payload de création (POST
 *      /reports, /pets/photos, …)
 *
 * Sécurité :
 *   - Auth requise — pas d'upload anonyme.
 *   - Rate-limit (30 presigns/h/IP) pour éviter qu'un compte
 *     compromis fasse exploser nos coûts S3.
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
import { getPresignedUploadUrl } from "@infra/storage/s3";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

type ContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

const KIND_PREFIXES = {
  report: "reports",
  pet: "pets",
  shelter: "shelters",
  pension: "pensions",
} as const;

const bodySchema = z.object({
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  kind: z.enum(["report", "pet", "shelter", "pension"]),
});

const EXPIRES_IN_SEC = 300; // 5 minutes — trade-off upload time / risk
const PUBLIC_URL_BASE = process.env.S3_PUBLIC_URL ?? "";

function extensionFor(ct: ContentType): "jpg" | "png" | "webp" {
  switch (ct) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
  }
}

export const POST = withApi(
  {
    authRequired: true,
    bodySchema,
    rateLimit: { key: "api:uploads:presign", limit: 30, windowSec: 3600 },
  },
  async ({ body, session, requestId }) => {
    const ext = extensionFor(body.contentType);
    const prefix = KIND_PREFIXES[body.kind];
    const userId = session!.user.id;
    const key = `${prefix}/${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const uploadUrl = await getPresignedUploadUrl(
      key,
      body.contentType,
      EXPIRES_IN_SEC
    );
    const publicUrl = `${PUBLIC_URL_BASE}/${key}`;

    return apiOk(
      {
        uploadUrl,
        publicUrl,
        key,
        expiresInSec: EXPIRES_IN_SEC,
      },
      { requestId }
    );
  }
);
