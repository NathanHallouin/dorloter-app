import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@infra/db";
import {
  petPhotos,
  pets,
  petSponsorships,
  shelters,
} from "@/server/db/schema";

export interface SponsorshipSummary {
  petId: string;
  petName: string;
  species: "chat" | "chien";
  shelterId: string;
  shelterName: string;
  shelterSlug: string;
  primaryPhotoUrl: string | null;
  message: string | null;
  createdAt: Date;
  /** Statut de l'animal au moment du fetch (peut avoir évolué depuis le parrainage). */
  petStatus:
    | "pre_adoptable"
    | "disponible"
    | "reserve"
    | "adopte"
    | "retire";
}

/**
 * Nombre de parrains pour un animal donné.
 */
export async function countSponsorsForPet(petId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(petSponsorships)
    .where(eq(petSponsorships.petId, petId));
  return Number(row?.count ?? 0);
}

/**
 * Compte les parrains pour un lot d'animaux. Utilisé sur la liste favoris
 * et le carrousel home pour afficher un badge discret.
 */
export async function countSponsorsForPets(
  petIds: string[]
): Promise<Map<string, number>> {
  if (petIds.length === 0) return new Map();
  const rows = await db
    .select({
      petId: petSponsorships.petId,
      count: sql<number>`count(*)::int`,
    })
    .from(petSponsorships)
    .where(inArray(petSponsorships.petId, petIds))
    .groupBy(petSponsorships.petId);
  return new Map(rows.map((r) => [r.petId, Number(r.count)]));
}

/**
 * True si l'utilisateur courant est déjà parrain de cet animal.
 */
export async function isSponsorOfPet(
  userId: string,
  petId: string
): Promise<boolean> {
  const [row] = await db
    .select({ petId: petSponsorships.petId })
    .from(petSponsorships)
    .where(
      and(
        eq(petSponsorships.userId, userId),
        eq(petSponsorships.petId, petId)
      )
    )
    .limit(1);
  return !!row;
}

/**
 * Liste des animaux parrainés par un utilisateur, joints au refuge et
 * à la photo primaire. Triée par parrainage récent.
 */
export async function getSponsoredPetsForUser(
  userId: string
): Promise<SponsorshipSummary[]> {
  const rows = await db
    .select({
      petId: pets.id,
      petName: pets.name,
      species: pets.species,
      petStatus: pets.status,
      shelterId: shelters.id,
      shelterName: shelters.name,
      shelterSlug: shelters.slug,
      photoUrl: sql<string | null>`(
        select url from ${petPhotos}
        where ${petPhotos.petId} = ${pets.id} and ${petPhotos.isPrimary} = true
        limit 1
      )`,
      message: petSponsorships.message,
      createdAt: petSponsorships.createdAt,
    })
    .from(petSponsorships)
    .innerJoin(pets, eq(pets.id, petSponsorships.petId))
    .innerJoin(shelters, eq(shelters.id, pets.shelterId))
    .where(eq(petSponsorships.userId, userId))
    .orderBy(desc(petSponsorships.createdAt));

  return rows.map((r) => ({
    petId: r.petId,
    petName: r.petName,
    species: r.species,
    shelterId: r.shelterId,
    shelterName: r.shelterName,
    shelterSlug: r.shelterSlug,
    primaryPhotoUrl: r.photoUrl,
    message: r.message,
    createdAt: r.createdAt,
    petStatus: r.petStatus,
  }));
}
