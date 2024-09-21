/**
 * GET /api/v1/uploads/voice/<key...>
 *
 * Stream d'un fichier audio uploadé via `POST /api/v1/uploads/voice`.
 * Le key est splatté pour conserver les slashs (`messages/voice/<userId>/<ts>-<uuid>.m4a`).
 *
 * Sécurité : on n'autorise que les clés du préfixe `messages/voice/` —
 * pas d'accès aux autres assets via cet endpoint.
 *
 * Cache 1 heure côté client : les fichiers audio sont immuables une fois
 * uploadés (jamais ré-écrits).
 */

import { NextResponse } from "next/server";
import { downloadFile } from "@infra/storage/s3";

interface RouteContext {
  params: Promise<{ key: string[] }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { key: segments } = await context.params;
  const key = segments.join("/");
  if (!key.startsWith("messages/voice/")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Préfixe non autorisé." } },
      { status: 403 }
    );
  }

  try {
    const { body, contentType } = await downloadFile(key);
    return new NextResponse(body as unknown as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, immutable",
        "Content-Length": String(body.length),
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Fichier introuvable." } },
      { status: 404 }
    );
  }
}
