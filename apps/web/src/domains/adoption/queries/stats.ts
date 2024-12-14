import { db } from "@infra/db";
import { applications, pets } from "@/server/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

export interface ShelterStats {
  catsTotal: number;
  catsAvailable: number;
  catsReserved: number;
  catsAdopted: number;
  applicationsTotal: number;
  applicationsPending: number;
  applicationsAccepted: number;
}

export async function getShelterStats(shelterId: string): Promise<ShelterStats> {
  const [catCounts] = await db
    .select({
      total: sql<number>`count(*)`,
      available: sql<number>`count(*) FILTER (WHERE ${pets.status} = 'disponible')`,
      reserved: sql<number>`count(*) FILTER (WHERE ${pets.status} = 'reserve')`,
      adopted: sql<number>`count(*) FILTER (WHERE ${pets.status} = 'adopte')`,
    })
    .from(pets)
    .where(eq(pets.shelterId, shelterId));

  const [appCounts] = await db
    .select({
      total: sql<number>`count(*)`,
      pending: sql<number>`count(*) FILTER (WHERE ${applications.status} IN ('envoyee', 'en_cours'))`,
      accepted: sql<number>`count(*) FILTER (WHERE ${applications.status} = 'acceptee')`,
    })
    .from(applications)
    .innerJoin(pets, eq(pets.id, applications.petId))
    .where(eq(pets.shelterId, shelterId));

  return {
    catsTotal: Number(catCounts?.total ?? 0),
    catsAvailable: Number(catCounts?.available ?? 0),
    catsReserved: Number(catCounts?.reserved ?? 0),
    catsAdopted: Number(catCounts?.adopted ?? 0),
    applicationsTotal: Number(appCounts?.total ?? 0),
    applicationsPending: Number(appCounts?.pending ?? 0),
    applicationsAccepted: Number(appCounts?.accepted ?? 0),
  };
}

/**
 * Compte les candidatures pending (envoyee/en_cours) pour un lot de pets.
 * Retourne un Map petId → count. Utilisé sur la liste refuge pour afficher
 * un badge "N candidatures" sur chaque card.
 */
export async function getPendingApplicationsCountForPets(
  petIds: string[]
): Promise<Map<string, number>> {
  if (petIds.length === 0) return new Map();
  const rows = await db
    .select({
      petId: applications.petId,
      count: sql<number>`count(*)`,
    })
    .from(applications)
    .where(
      and(
        inArray(applications.petId, petIds),
        sql`${applications.status} IN ('envoyee', 'en_cours')`
      )
    )
    .groupBy(applications.petId);
  return new Map(rows.map((r) => [r.petId, Number(r.count)]));
}

export async function getApplicationsCountForCat(
  petId: string
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(applications)
    .where(
      and(
        eq(applications.petId, petId),
        sql`${applications.status} IN ('envoyee', 'en_cours')`
      )
    );
  return Number(row?.count ?? 0);
}

export interface GlobalAdoptionStats {
  available: number;
  cats: number;
  dogs: number;
  adoptedTotal: number;
  adoptedThisMonth: number;
}

/**
 * Statistiques agrégées tous refuges confondus, pour la home publique.
 * Les chiffres "adopté" se basent sur `updated_at` à défaut d'une colonne
 * dédiée — approximation acceptable pour un compteur d'accueil.
 */
export async function getGlobalAdoptionStats(): Promise<GlobalAdoptionStats> {
  const [counts] = await db
    .select({
      available: sql<number>`count(*) FILTER (WHERE ${pets.status} = 'disponible')`,
      cats: sql<number>`count(*) FILTER (WHERE ${pets.status} = 'disponible' AND ${pets.species} = 'chat')`,
      dogs: sql<number>`count(*) FILTER (WHERE ${pets.status} = 'disponible' AND ${pets.species} = 'chien')`,
      adoptedTotal: sql<number>`count(*) FILTER (WHERE ${pets.status} = 'adopte')`,
      adoptedThisMonth: sql<number>`count(*) FILTER (WHERE ${pets.status} = 'adopte' AND ${pets.updatedAt} >= date_trunc('month', now()))`,
    })
    .from(pets);

  return {
    available: Number(counts?.available ?? 0),
    cats: Number(counts?.cats ?? 0),
    dogs: Number(counts?.dogs ?? 0),
    adoptedTotal: Number(counts?.adoptedTotal ?? 0),
    adoptedThisMonth: Number(counts?.adoptedThisMonth ?? 0),
  };
}
