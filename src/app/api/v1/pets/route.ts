/**
 * GET /api/v1/pets
 *
 * Catalogue paginé des animaux à adopter (statut `disponible`). Filtres
 * supportés : `species`, `sex`, `ageCategory`, `okWithCats`, `okWithDogs`,
 * `okWithChildren`, `shelterId`, `search`. Pagination cursor-based.
 *
 * Réponse :
 *   { data: PetSummaryDto[], pagination: { cursor: string|null, hasMore: boolean } }
 *
 * Pas d'auth requise. Pas de rate-limit explicite (lecture, cache CDN OK).
 */

import { z } from "zod";
import { withApi, apiPaginated } from "@infra/api";
import { listPetsService } from "@adoption/public";
import { toPetSummaryDto } from "@/app/api/v1/_dtos/pet";

const querySchema = z.object({
  species: z.enum(["chat", "chien"]).optional(),
  sex: z.enum(["male", "femelle", "inconnu"]).optional(),
  ageCategory: z.enum(["chaton", "jeune", "adulte", "senior"]).optional(),
  okWithCats: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
  okWithDogs: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
  okWithChildren: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
  shelterId: z.string().uuid().optional(),
  search: z.string().min(1).max(100).optional(),
  cursor: z.string().min(1).max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const GET = withApi(
  { querySchema },
  async ({ query, requestId }) => {
    const { pets, nextCursor } = await listPetsService({
      filters: {
        species: query.species,
        sex: query.sex,
        ageCategory: query.ageCategory,
        okWithCats: query.okWithCats,
        okWithDogs: query.okWithDogs,
        okWithChildren: query.okWithChildren,
        shelterId: query.shelterId,
        search: query.search,
      },
      cursor: query.cursor ?? null,
      limit: query.limit,
    });

    return apiPaginated(
      pets.map(toPetSummaryDto),
      { cursor: nextCursor, hasMore: nextCursor !== null },
      { requestId }
    );
  }
);
