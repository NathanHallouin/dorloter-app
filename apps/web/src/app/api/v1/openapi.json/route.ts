/**
 * GET /api/v1/openapi.json
 *
 * Document OpenAPI 3.1 décrivant l'API publique. Servi en JSON, mis en
 * cache 1 heure côté CDN. Consommé par :
 *   - `openapi-typescript` pour générer le client TS de l'app mobile
 *   - Postman / Insomnia / Hoppscotch pour exploration
 *   - Outils de validation contractuelle
 */

import { NextResponse } from "next/server";
import { buildOpenApiDocument } from "@infra/api/openapi";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://dorloter.fr";
  const doc = buildOpenApiDocument(siteUrl);

  return NextResponse.json(doc, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
