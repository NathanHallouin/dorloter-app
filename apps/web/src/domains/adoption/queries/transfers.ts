import { and, asc, desc, eq, ne, or } from "drizzle-orm";
import { db } from "@infra/db";
import {
  petTransfers,
  pets,
  shelters,
  users,
} from "@/server/db/schema";
import { aliasedTable } from "drizzle-orm";
import type {
  PetTransfer,
  PetTransferStatus,
  PetTransferWithContext,
} from "../lib/transfer-types";

async function fetchEnriched(
  conditions: ReturnType<typeof eq>[]
): Promise<PetTransferWithContext[]> {
  const fromS = aliasedTable(shelters, "from_shelter");
  const toS = aliasedTable(shelters, "to_shelter");

  const rows = await db
    .select({
      id: petTransfers.id,
      petId: petTransfers.petId,
      fromShelterId: petTransfers.fromShelterId,
      toShelterId: petTransfers.toShelterId,
      requestedByUserId: petTransfers.requestedByUserId,
      message: petTransfers.message,
      status: petTransfers.status,
      decidedByUserId: petTransfers.decidedByUserId,
      decisionNote: petTransfers.decisionNote,
      requestedAt: petTransfers.requestedAt,
      decidedAt: petTransfers.decidedAt,
      updatedAt: petTransfers.updatedAt,
      petName: pets.name,
      petSpecies: pets.species,
      fromShelterName: fromS.name,
      fromShelterSlug: fromS.slug,
      toShelterName: toS.name,
      toShelterSlug: toS.slug,
      requestedByName: users.name,
    })
    .from(petTransfers)
    .innerJoin(pets, eq(pets.id, petTransfers.petId))
    .innerJoin(fromS, eq(fromS.id, petTransfers.fromShelterId))
    .innerJoin(toS, eq(toS.id, petTransfers.toShelterId))
    .innerJoin(users, eq(users.id, petTransfers.requestedByUserId))
    .where(and(...conditions))
    .orderBy(desc(petTransfers.requestedAt));

  return rows.map((r) => ({
    id: r.id,
    petId: r.petId,
    fromShelterId: r.fromShelterId,
    toShelterId: r.toShelterId,
    requestedByUserId: r.requestedByUserId,
    message: r.message,
    status: r.status as PetTransferStatus,
    decidedByUserId: r.decidedByUserId,
    decisionNote: r.decisionNote,
    requestedAt: r.requestedAt,
    decidedAt: r.decidedAt,
    updatedAt: r.updatedAt,
    petName: r.petName,
    petSpecies: r.petSpecies,
    fromShelterName: r.fromShelterName,
    fromShelterSlug: r.fromShelterSlug,
    toShelterName: r.toShelterName,
    toShelterSlug: r.toShelterSlug,
    requestedByName: r.requestedByName,
  }));
}

/**
 * Tous les transferts impliquant un refuge (sortants + entrants),
 * enrichis avec nom de pet et noms refuges.
 */
export async function getTransfersForShelter(
  shelterId: string
): Promise<PetTransferWithContext[]> {
  return fetchEnriched([
    or(
      eq(petTransfers.fromShelterId, shelterId),
      eq(petTransfers.toShelterId, shelterId)
    )!,
  ]);
}

export async function getTransferById(
  id: string
): Promise<PetTransferWithContext | null> {
  const rows = await fetchEnriched([eq(petTransfers.id, id)]);
  return rows[0] ?? null;
}

/**
 * Compteur de transferts en attente pour un refuge (entrants à traiter).
 * Utile pour un badge sidebar.
 */
export async function countPendingInboundTransfers(
  shelterId: string
): Promise<number> {
  const rows = await db
    .select({ id: petTransfers.id })
    .from(petTransfers)
    .where(
      and(
        eq(petTransfers.toShelterId, shelterId),
        eq(petTransfers.status, "en_attente")
      )
    );
  return rows.length;
}

/**
 * Refuges éligibles comme destinataires d'un transfert (tous sauf le refuge courant,
 * vérifiés en priorité). Format léger pour un sélecteur.
 */
export async function listShelterTransferTargets(
  currentShelterId: string
): Promise<Array<{ id: string; name: string; isVerified: boolean }>> {
  const rows = await db
    .select({
      id: shelters.id,
      name: shelters.name,
      isVerified: shelters.isVerified,
    })
    .from(shelters)
    .where(ne(shelters.id, currentShelterId))
    .orderBy(desc(shelters.isVerified), asc(shelters.name));
  return rows;
}

/**
 * Historique des transferts d'un animal (lecture seule).
 */
export async function getTransferHistoryForPet(
  petId: string
): Promise<PetTransfer[]> {
  const rows = await db
    .select()
    .from(petTransfers)
    .where(eq(petTransfers.petId, petId))
    .orderBy(asc(petTransfers.requestedAt));
  return rows.map((r) => ({
    id: r.id,
    petId: r.petId,
    fromShelterId: r.fromShelterId,
    toShelterId: r.toShelterId,
    requestedByUserId: r.requestedByUserId,
    message: r.message,
    status: r.status as PetTransferStatus,
    decidedByUserId: r.decidedByUserId,
    decisionNote: r.decisionNote,
    requestedAt: r.requestedAt,
    decidedAt: r.decidedAt,
    updatedAt: r.updatedAt,
  }));
}
