/**
 * POST /api/v1/uploads/voice
 *
 * Upload d'un message vocal via multipart. Contrairement à
 * `/api/v1/uploads/presign` (qui renvoie une URL S3 signée pour PUT
 * direct), cet endpoint accepte le fichier en multipart et l'upload
 * côté serveur. Raison : en dev local, MinIO tourne sur `localhost:9000`
 * — pas joignable depuis un mobile distant. En passant par le serveur
 * (qui est joignable via le tunnel cloudflared), on évite ce souci.
 *
 * Le `url` retournée est une route Next.js (`/api/v1/uploads/voice/<key>`)
 * qui stream le fichier depuis S3. En prod avec un bucket public CDN,
 * cette indirection sera juste un fallback ; on pourra retourner l'URL
 * S3 publique directement.
 *
 * Rate-limit 30/h/user. Taille max 5 Mo (≈ 5 min de M4A).
 */

import { NextResponse } from "next/server";
import { withApi } from "@infra/api";
import { unprocessable, validationFailed } from "@infra/api/errors";
import { uploadFile } from "@infra/storage/s3";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "audio/mp4",
  "audio/mpeg",
  "audio/aac",
  "audio/webm",
]);

const EXT_BY_TYPE: Record<string, string> = {
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/aac": "aac",
  "audio/webm": "webm",
};

export const POST = withApi(
  {
    authRequired: true,
    rateLimit: { key: "api:uploads:voice", limit: 30, windowSec: 3600 },
  },
  async ({ request, session, requestId }) => {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw validationFailed("Multipart/form-data attendu.");
    }
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw validationFailed("Champ `file` manquant.");
    }
    if (file.size > MAX_BYTES) {
      throw unprocessable("Fichier trop volumineux (max 5 Mo).", {
        size: file.size,
      });
    }
    const contentType = file.type || "audio/mp4";
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      throw validationFailed(
        `Type audio non supporté (${contentType}). Attendu : ${[...ALLOWED_CONTENT_TYPES].join(", ")}.`
      );
    }

    const ext = EXT_BY_TYPE[contentType];
    const userId = session!.user.id;
    const key = `messages/voice/${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    await uploadFile(key, bytes, contentType);

    // URL relative — résolue côté client en préfixant avec l'API base URL.
    // Avantage : marche derrière n'importe quel tunnel sans config serveur,
    // car le mobile préfixe avec son `apiBaseUrl`.
    const url = `/api/v1/uploads/voice/${key}`;

    return NextResponse.json(
      { data: { url, key } },
      {
        status: 201,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "X-Request-Id": requestId,
        },
      }
    );
  }
);
