import { NextResponse } from "next/server";

/**
 * GET /api/v1
 *
 * Metadata humaine + machine de l'API publique. Pointe vers la doc
 * et le schéma OpenAPI. Pas de cookie, pas d'auth. Cache 1h.
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://dorloter.fr";
  return NextResponse.json(
    {
      name: "Dorloter API",
      version: "v1",
      description:
        "API REST publique : refuges, animaux à adopter, signalements perdus/trouvés, pensions, statistiques.",
      documentation: `${base}/api`,
      openapi: `${base}/api/v1/openapi.json`,
      license: {
        name: "CC-BY 4.0",
        attribution: "Source : Dorloter.fr",
      },
      contact: "api@dorloter.fr",
      rateLimit: {
        requestsPerMinute: 60,
        scope: "ip",
      },
      cors: "open",
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}
