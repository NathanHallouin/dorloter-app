import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@infra/db";
import {
  fosterFamilies,
  petFosterPlacements,
  pets,
  petPhotos,
  shelters,
  users,
} from "@/server/db/schema";
import type {
  FosterFamily,
  FosterFamilyStatus,
  FosterFamilyWithUser,
  FosterPlacement,
  FosterPlacementStatus,
  FosterPlacementWithContext,
} from "../lib/foster-family-types";

function rowToFamily(
  r: typeof fosterFamilies.$inferSelect
): FosterFamily {
  return {
    id: r.id,
    userId: r.userId,
    shelterId: r.shelterId,
    status: r.status as FosterFamilyStatus,
    acceptsCats: r.acceptsCats,
    acceptsDogs: r.acceptsDogs,
    maxCapacity: r.maxCapacity,
    hasGarden: r.hasGarden,
    hasOtherPets: r.hasOtherPets,
    otherPetsDescription: r.otherPetsDescription,
    hasChildren: r.hasChildren,
    childrenAges: r.childrenAges,
    experience: r.experience,
    motivation: r.motivation,
    address: r.address,
    phone: r.phone,
    shelterNotes: r.shelterNotes,
    validatedAt: r.validatedAt,
    rejectedReason: r.rejectedReason,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function rowToPlacement(
  r: typeof petFosterPlacements.$inferSelect
): FosterPlacement {
  return {
    id: r.id,
    petId: r.petId,
    fosterFamilyId: r.fosterFamilyId,
    shelterId: r.shelterId,
    status: r.status as FosterPlacementStatus,
    startDate: r.startDate,
    expectedEndDate: r.expectedEndDate,
    actualEndDate: r.actualEndDate,
    reason: r.reason,
    shelterNotes: r.shelterNotes,
    fosterFeedback: r.fosterFeedback,
    createdByUserId: r.createdByUserId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/**
 * Toutes les FA d'un refuge avec user joint et compteur de placements actifs.
 * Utilisé pour le panel refuge (tabs candidatures / actives / pause / archive).
 */
export async function getFosterFamiliesForShelter(
  shelterId: string
): Promise<FosterFamilyWithUser[]> {
  const rows = await db
    .select({
      family: fosterFamilies,
      userName: users.name,
      userEmail: users.email,
      shelterName: shelters.name,
      shelterSlug: shelters.slug,
    })
    .from(fosterFamilies)
    .innerJoin(users, eq(users.id, fosterFamilies.userId))
    .innerJoin(shelters, eq(shelters.id, fosterFamilies.shelterId))
    .where(eq(fosterFamilies.shelterId, shelterId))
    .orderBy(desc(fosterFamilies.createdAt));

  if (rows.length === 0) return [];

  // Compte les placements actifs pour chaque FA.
  const ids = rows.map((r) => r.family.id);
  const counts = await db
    .select({
      fosterFamilyId: petFosterPlacements.fosterFamilyId,
      n: sql<number>`count(*)::int`,
    })
    .from(petFosterPlacements)
    .where(
      and(
        inArray(petFosterPlacements.fosterFamilyId, ids),
        inArray(petFosterPlacements.status, ["planifie", "en_cours"])
      )
    )
    .groupBy(petFosterPlacements.fosterFamilyId);
  const countMap = new Map(counts.map((c) => [c.fosterFamilyId, c.n]));

  return rows.map((r) => ({
    ...rowToFamily(r.family),
    userName: r.userName,
    userEmail: r.userEmail,
    shelterName: r.shelterName,
    shelterSlug: r.shelterSlug,
    activePlacementsCount: countMap.get(r.family.id) ?? 0,
  }));
}

export async function getFosterFamilyById(
  id: string
): Promise<FosterFamilyWithUser | null> {
  const rows = await db
    .select({
      family: fosterFamilies,
      userName: users.name,
      userEmail: users.email,
      shelterName: shelters.name,
      shelterSlug: shelters.slug,
    })
    .from(fosterFamilies)
    .innerJoin(users, eq(users.id, fosterFamilies.userId))
    .innerJoin(shelters, eq(shelters.id, fosterFamilies.shelterId))
    .where(eq(fosterFamilies.id, id))
    .limit(1);
  if (rows.length === 0) return null;
  const r = rows[0]!;
  const counts = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(petFosterPlacements)
    .where(
      and(
        eq(petFosterPlacements.fosterFamilyId, id),
        inArray(petFosterPlacements.status, ["planifie", "en_cours"])
      )
    );
  return {
    ...rowToFamily(r.family),
    userName: r.userName,
    userEmail: r.userEmail,
    shelterName: r.shelterName,
    shelterSlug: r.shelterSlug,
    activePlacementsCount: counts[0]?.n ?? 0,
  };
}

/** FA actives d'un utilisateur (peut en avoir plusieurs si plusieurs refuges). */
export async function getActiveFosterFamiliesForUser(
  userId: string
): Promise<FosterFamilyWithUser[]> {
  const rows = await db
    .select({
      family: fosterFamilies,
      userName: users.name,
      userEmail: users.email,
      shelterName: shelters.name,
      shelterSlug: shelters.slug,
    })
    .from(fosterFamilies)
    .innerJoin(users, eq(users.id, fosterFamilies.userId))
    .innerJoin(shelters, eq(shelters.id, fosterFamilies.shelterId))
    .where(
      and(
        eq(fosterFamilies.userId, userId),
        inArray(fosterFamilies.status, ["active", "pause"])
      )
    );
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.family.id);
  const counts = await db
    .select({
      fosterFamilyId: petFosterPlacements.fosterFamilyId,
      n: sql<number>`count(*)::int`,
    })
    .from(petFosterPlacements)
    .where(
      and(
        inArray(petFosterPlacements.fosterFamilyId, ids),
        inArray(petFosterPlacements.status, ["planifie", "en_cours"])
      )
    )
    .groupBy(petFosterPlacements.fosterFamilyId);
  const countMap = new Map(counts.map((c) => [c.fosterFamilyId, c.n]));

  return rows.map((r) => ({
    ...rowToFamily(r.family),
    userName: r.userName,
    userEmail: r.userEmail,
    shelterName: r.shelterName,
    shelterSlug: r.shelterSlug,
    activePlacementsCount: countMap.get(r.family.id) ?? 0,
  }));
}

export async function countPendingFosterCandidaturesForShelter(
  shelterId: string
): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(fosterFamilies)
    .where(
      and(
        eq(fosterFamilies.shelterId, shelterId),
        eq(fosterFamilies.status, "candidature")
      )
    );
  return row?.n ?? 0;
}

/** Existe-t-il déjà une candidature/active de cet user pour ce refuge ? */
export async function getFosterFamilyForUserAndShelter(
  userId: string,
  shelterId: string
): Promise<FosterFamily | null> {
  const [row] = await db
    .select()
    .from(fosterFamilies)
    .where(
      and(
        eq(fosterFamilies.userId, userId),
        eq(fosterFamilies.shelterId, shelterId),
        inArray(fosterFamilies.status, [
          "candidature",
          "active",
          "pause",
        ])
      )
    )
    .limit(1);
  return row ? rowToFamily(row) : null;
}

// ─── Placements ────────────────────────────────────────────────────────────

async function fetchPlacementsEnriched(
  conditions: ReturnType<typeof eq>[]
): Promise<FosterPlacementWithContext[]> {
  const rows = await db
    .select({
      placement: petFosterPlacements,
      petName: pets.name,
      petSpecies: pets.species,
      fosterUserName: users.name,
      fosterUserEmail: users.email,
      shelterName: shelters.name,
    })
    .from(petFosterPlacements)
    .innerJoin(pets, eq(pets.id, petFosterPlacements.petId))
    .innerJoin(
      fosterFamilies,
      eq(fosterFamilies.id, petFosterPlacements.fosterFamilyId)
    )
    .innerJoin(users, eq(users.id, fosterFamilies.userId))
    .innerJoin(shelters, eq(shelters.id, petFosterPlacements.shelterId))
    .where(and(...conditions))
    .orderBy(desc(petFosterPlacements.startDate));

  if (rows.length === 0) return [];

  const petIds = rows.map((r) => r.placement.petId);
  const photos = await db
    .select({ petId: petPhotos.petId, url: petPhotos.url })
    .from(petPhotos)
    .where(
      and(inArray(petPhotos.petId, petIds), eq(petPhotos.isPrimary, true))
    );
  const photoMap = new Map(photos.map((p) => [p.petId, p.url]));

  return rows.map((r) => ({
    ...rowToPlacement(r.placement),
    petName: r.petName,
    petSpecies: r.petSpecies,
    petPrimaryPhotoUrl: photoMap.get(r.placement.petId) ?? null,
    fosterUserName: r.fosterUserName,
    fosterUserEmail: r.fosterUserEmail,
    shelterName: r.shelterName,
  }));
}

export async function getActivePlacementsForShelter(
  shelterId: string
): Promise<FosterPlacementWithContext[]> {
  return fetchPlacementsEnriched([
    eq(petFosterPlacements.shelterId, shelterId),
    inArray(petFosterPlacements.status, ["planifie", "en_cours"]),
  ]);
}

export async function getAllPlacementsForShelter(
  shelterId: string
): Promise<FosterPlacementWithContext[]> {
  return fetchPlacementsEnriched([
    eq(petFosterPlacements.shelterId, shelterId),
  ]);
}

export async function getActivePlacementsForFosterFamily(
  fosterFamilyId: string
): Promise<FosterPlacementWithContext[]> {
  return fetchPlacementsEnriched([
    eq(petFosterPlacements.fosterFamilyId, fosterFamilyId),
    inArray(petFosterPlacements.status, ["planifie", "en_cours"]),
  ]);
}

export async function getActivePlacementsForUser(
  userId: string
): Promise<FosterPlacementWithContext[]> {
  const families = await db
    .select({ id: fosterFamilies.id })
    .from(fosterFamilies)
    .where(eq(fosterFamilies.userId, userId));
  if (families.length === 0) return [];
  return fetchPlacementsEnriched([
    inArray(
      petFosterPlacements.fosterFamilyId,
      families.map((f) => f.id)
    ),
    inArray(petFosterPlacements.status, ["planifie", "en_cours"]),
  ]);
}

export async function getPlacementById(
  id: string
): Promise<FosterPlacementWithContext | null> {
  const rows = await fetchPlacementsEnriched([
    eq(petFosterPlacements.id, id),
  ]);
  return rows[0] ?? null;
}

/** Pets disponibles pour un placement : ceux du refuge qui n'ont pas
 * de placement actif. */
export async function getPetsAvailableForFosterPlacement(
  shelterId: string
): Promise<
  Array<{ id: string; name: string; species: "chat" | "chien" }>
> {
  const activePetIds = await db
    .selectDistinct({ petId: petFosterPlacements.petId })
    .from(petFosterPlacements)
    .innerJoin(pets, eq(pets.id, petFosterPlacements.petId))
    .where(
      and(
        eq(pets.shelterId, shelterId),
        inArray(petFosterPlacements.status, ["planifie", "en_cours"])
      )
    );
  const excluded = new Set(activePetIds.map((r) => r.petId));

  const rows = await db
    .select({ id: pets.id, name: pets.name, species: pets.species })
    .from(pets)
    .where(
      and(
        eq(pets.shelterId, shelterId),
        inArray(pets.status, ["disponible", "pre_adoptable", "reserve"])
      )
    )
    .orderBy(pets.name);

  return rows.filter((r) => !excluded.has(r.id));
}
