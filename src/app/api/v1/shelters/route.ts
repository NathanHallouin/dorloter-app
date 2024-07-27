/**
 * GET /api/v1/shelters
 *
 * Annuaire paginé des refuges. Tri alphabétique. Filtres : `verifiedOnly`,
 * `search` (nom + description). Pagination cursor-based.
 *
 * Réponse :
 *   { data: ShelterSummaryDto[], pagination: { cursor, hasMore } }
 *
 * Pas d'auth requise.
 */

import { z } from "zod";
import { withApi, apiPaginated } from "@infra/api";
import { listSheltersService } from "@shelters/public";
import { toShelterSummaryDto } from "@/app/api/v1/_dtos/shelter";

const querySchema = z.object({
  verifiedOnly: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
  search: z.string().min(1).max(100).optional(),
  cursor: z.string().min(1).max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const GET = withApi(
  { querySchema },
  async ({ query, requestId }) => {
    const { shelters, nextCursor } = await listSheltersService({
      filters: {
        verifiedOnly: query.verifiedOnly,
        search: query.search,
      },
      cursor: query.cursor ?? null,
      limit: query.limit,
    });

    return apiPaginated(
      shelters.map(toShelterSummaryDto),
      { cursor: nextCursor, hasMore: nextCursor !== null },
      { requestId }
    );
  }
);
