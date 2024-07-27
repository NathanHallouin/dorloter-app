/**
 * GET /api/v1/pensions
 *
 * Annuaire paginé des pensions agréées (vérifiées uniquement). Tri
 * alphabétique. Cursor-based.
 *
 * Filtres :
 *   - `acceptsCats` / `acceptsDogs` : booléens
 *   - `maxPriceCat` / `maxPriceDog` : prix max par jour (€)
 *   - `services` : liste séparée par virgules (ex. `medication,transport`)
 *   - `search` : nom ou adresse
 *
 * Réponse :
 *   { data: PensionSummaryDto[], pagination: { cursor, hasMore } }
 *
 * Pas d'auth requise.
 */

import { z } from "zod";
import { withApi, apiPaginated } from "@infra/api";
import {
  listPensionsService,
  PENSION_SERVICE_KEYS,
  type PensionServiceKey,
} from "@pensions/public";
import { toPensionSummaryDto } from "@/app/api/v1/_dtos/pension";

const SERVICE_KEY_SET = new Set<string>(PENSION_SERVICE_KEYS);

const querySchema = z.object({
  acceptsCats: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
  acceptsDogs: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
  maxPriceCat: z.coerce.number().positive().max(1000).optional(),
  maxPriceDog: z.coerce.number().positive().max(1000).optional(),
  services: z
    .string()
    .max(200)
    .optional()
    .transform((s) => {
      if (!s) return undefined;
      const keys = s
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      // Filtre uniquement les keys connues — les inconnues sont ignorées
      // côté API (le service throw aussi en cas de doute).
      return keys.filter((k) =>
        SERVICE_KEY_SET.has(k)
      ) as PensionServiceKey[];
    }),
  search: z.string().min(1).max(100).optional(),
  cursor: z.string().min(1).max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const GET = withApi(
  { querySchema },
  async ({ query, requestId }) => {
    const { pensions, nextCursor } = await listPensionsService({
      filters: {
        acceptsCats: query.acceptsCats,
        acceptsDogs: query.acceptsDogs,
        maxPriceCat: query.maxPriceCat,
        maxPriceDog: query.maxPriceDog,
        services: query.services,
        search: query.search,
      },
      cursor: query.cursor ?? null,
      limit: query.limit,
    });

    return apiPaginated(
      pensions.map(toPensionSummaryDto),
      { cursor: nextCursor, hasMore: nextCursor !== null },
      { requestId }
    );
  }
);
