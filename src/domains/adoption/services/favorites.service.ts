/**
 * Service favorites — toggle d'un pet dans la liste de favoris user.
 *
 * Le toggle est idempotent : ré-appel = état basculé. Les callers
 * doivent traiter `isFavorite` comme la nouvelle vérité.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@infra/db";
import { notFound, validationFailed } from "@infra/api/errors";
import { favorites, pets } from "@/server/db/schema";
import { getApplicationsCountForCat } from "../queries/stats";

export interface ToggleFavoriteResult {
  isFavorite: boolean;
  petName: string | null;
  /** Candidatures actives sur ce pet — null si on vient de retirer le favori. */
  applicationsCount: number | null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function toggleFavorite(
  userId: string,
  petId: string
): Promise<ToggleFavoriteResult> {
  if (!UUID_RE.test(petId)) {
    throw validationFailed("ID animal invalide.");
  }

  // Vérifier l'existence (404 si non) + récupérer le nom pour le toast.
  const [pet] = await db
    .select({ name: pets.name })
    .from(pets)
    .where(eq(pets.id, petId))
    .limit(1);
  if (!pet) {
    throw notFound("Animal", petId);
  }

  const [existing] = await db
    .select({ userId: favorites.userId })
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.petId, petId)))
    .limit(1);

  if (existing) {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.petId, petId)));
    return {
      isFavorite: false,
      petName: pet.name,
      applicationsCount: null,
    };
  }

  await db.insert(favorites).values({ userId, petId });
  const applicationsCount = await getApplicationsCountForCat(petId);

  return {
    isFavorite: true,
    petName: pet.name,
    applicationsCount,
  };
}
