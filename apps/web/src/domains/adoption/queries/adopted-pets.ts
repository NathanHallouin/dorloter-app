import { and, desc, eq } from "drizzle-orm";
import { db } from "@infra/db";
import { applications, pets, shelters } from "@/server/db/schema";

export interface AdoptedPetSummary {
  id: string;
  name: string;
  species: "chat" | "chien";
  breed: string | null;
  shelterId: string;
  shelterName: string;
  shelterSlug: string;
  /** Date d'acceptation de la candidature (timestamp), proxy de la date d'adoption. */
  adoptedAt: Date;
  primaryPhotoUrl: string | null;
}

/**
 * Liste des animaux adoptés par un utilisateur, déterminés via les
 * candidatures `acceptee` croisées avec les pets `status='adopte'` ou
 * `reserve` (en cours de finalisation côté refuge).
 *
 * Note : un user pourrait avoir plusieurs candidatures acceptées (cas
 * rares mais possibles). On déduplique côté JS.
 */
export async function getAdoptedPetsForUser(
  userId: string
): Promise<AdoptedPetSummary[]> {
  const rows = await db
    .select({
      petId: pets.id,
      petName: pets.name,
      species: pets.species,
      breed: pets.breed,
      petStatus: pets.status,
      shelterId: shelters.id,
      shelterName: shelters.name,
      shelterSlug: shelters.slug,
      adoptedAt: applications.updatedAt,
    })
    .from(applications)
    .innerJoin(pets, eq(pets.id, applications.petId))
    .innerJoin(shelters, eq(shelters.id, pets.shelterId))
    .where(
      and(
        eq(applications.userId, userId),
        eq(applications.status, "acceptee")
      )
    )
    .orderBy(desc(applications.updatedAt));

  const seen = new Set<string>();
  const summaries: AdoptedPetSummary[] = [];
  for (const r of rows) {
    if (seen.has(r.petId)) continue;
    seen.add(r.petId);
    summaries.push({
      id: r.petId,
      name: r.petName,
      species: r.species,
      breed: r.breed,
      shelterId: r.shelterId,
      shelterName: r.shelterName,
      shelterSlug: r.shelterSlug,
      adoptedAt: r.adoptedAt,
      primaryPhotoUrl: null,
    });
  }
  return summaries;
}

/**
 * Vérifie qu'un utilisateur est bien l'adoptant accepté d'un animal.
 * Retourne true si une candidature acceptée existe pour ce couple.
 */
export async function isAdopterOfPet(
  userId: string,
  petId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        eq(applications.userId, userId),
        eq(applications.petId, petId),
        eq(applications.status, "acceptee")
      )
    )
    .limit(1);
  return !!row;
}
