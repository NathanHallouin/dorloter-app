/**
 * GET /api/v1/reports — liste paginée
 * POST /api/v1/reports — création (auth requise)
 *
 * Liste paginée des signalements perdus/trouvés. Tri par `dateEvent DESC`
 * (ou par distance si `near` est passé).
 *
 * Filtres GET :
 *   - `type` : perdu | trouve
 *   - `status` : actif (défaut) | resolu | expire
 *   - `species` : chat | chien
 *   - `bbox=west,south,east,north` (cartographie)
 *   - `lat`, `lng`, `radiusKm` (recherche utilisateur — alternative à bbox)
 *   - `sinceDays` : 1 | 7 | 30
 *
 * `bbox` et `near` sont exclusifs.
 *
 * Sécurité : pas de contact exposé dans les items. Voir détail.
 */

import { z } from "zod";
import { withApi, apiCreated, apiPaginated } from "@infra/api";
import {
  listReportsService,
  createReportService,
  reportFormSchema,
} from "@lost-found/public";
import { toReportSummaryDto } from "@/app/api/v1/_dtos/report";
import { validationFailed } from "@infra/api/errors";

const bboxSchema = z
  .string()
  .regex(/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/)
  .transform((s) => {
    const parts = s.split(",").map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
      throw validationFailed("Bbox malformée — `west,south,east,north`.");
    }
    return {
      west: parts[0]!,
      south: parts[1]!,
      east: parts[2]!,
      north: parts[3]!,
    };
  });

const querySchema = z
  .object({
    type: z.enum(["perdu", "trouve"]).optional(),
    status: z.enum(["actif", "resolu", "expire"]).optional(),
    species: z.enum(["chat", "chien"]).optional(),
    bbox: bboxSchema.optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().min(0.1).max(200).optional(),
    sinceDays: z.coerce.number().int().min(1).max(365).optional(),
    cursor: z.string().min(1).max(500).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .refine(
    (q) => {
      // `near` exige les 3 (lat + lng + radiusKm) ou aucun
      const provided = [q.lat, q.lng, q.radiusKm].filter(
        (v) => v !== undefined
      ).length;
      return provided === 0 || provided === 3;
    },
    {
      message:
        "Pour `near`, fournir `lat` + `lng` + `radiusKm` ensemble (ou aucun).",
    }
  );

export const GET = withApi(
  { querySchema },
  async ({ query, requestId }) => {
    const near =
      query.lat !== undefined &&
      query.lng !== undefined &&
      query.radiusKm !== undefined
        ? {
            latitude: query.lat,
            longitude: query.lng,
            radiusKm: query.radiusKm,
          }
        : undefined;

    const { reports, nextCursor } = await listReportsService({
      filters: {
        type: query.type,
        status: query.status,
        species: query.species,
        bbox: query.bbox,
        near,
        sinceDays: query.sinceDays,
      },
      cursor: query.cursor ?? null,
      limit: query.limit,
    });

    return apiPaginated(
      reports.map(toReportSummaryDto),
      { cursor: nextCursor, hasMore: nextCursor !== null },
      { requestId }
    );
  }
);

const photoSchema = z.object({
  url: z.string().url().max(2048),
  blurDataUrl: z.string().max(8192).optional().nullable(),
});

const bodySchema = reportFormSchema.extend({
  photos: z.array(photoSchema).max(8).optional(),
});

export const POST = withApi(
  {
    authRequired: true,
    bodySchema,
    rateLimit: { key: "api:reports:create", limit: 5, windowSec: 3600 },
  },
  async ({ body, session, requestId }) => {
    const result = await createReportService(session!.user.id, body);
    return apiCreated(result, { requestId });
  }
);
