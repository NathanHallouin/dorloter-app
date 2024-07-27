import { db } from "@infra/db";
import { pets, shelterFollows, shelters } from "@/server/db/schema";
import { and, eq, sql } from "drizzle-orm";

export async function getShelters() {
  return db.select().from(shelters).orderBy(shelters.name);
}

export async function getShelterById(id: string) {
  const results = await db
    .select()
    .from(shelters)
    .where(eq(shelters.id, id))
    .limit(1);
  return results[0] ?? null;
}

export async function getShelterBySlug(slug: string) {
  const results = await db
    .select()
    .from(shelters)
    .where(eq(shelters.slug, slug))
    .limit(1);
  return results[0] ?? null;
}

/**
 * Stats publiques d'un refuge affichées sur la fiche : nombre de chats à
 * adopter, déjà adoptés, en cours, et followers.
 */
export async function getShelterPublicStats(shelterId: string) {
  const [catStats] = await db
    .select({
      available: sql<number>`count(*) filter (where status = 'disponible')`,
      adopted: sql<number>`count(*) filter (where status = 'adopte')`,
      reserved: sql<number>`count(*) filter (where status = 'reserve')`,
    })
    .from(pets)
    .where(eq(pets.shelterId, shelterId));

  const [followers] = await db
    .select({ count: sql<number>`count(*)` })
    .from(shelterFollows)
    .where(eq(shelterFollows.shelterId, shelterId));

  return {
    available: Number(catStats?.available ?? 0),
    adopted: Number(catStats?.adopted ?? 0),
    reserved: Number(catStats?.reserved ?? 0),
    followers: Number(followers?.count ?? 0),
  };
}

export async function isFollowingShelter(
  userId: string,
  shelterId: string
): Promise<boolean> {
  const [row] = await db
    .select({ userId: shelterFollows.userId })
    .from(shelterFollows)
    .where(
      and(
        eq(shelterFollows.userId, userId),
        eq(shelterFollows.shelterId, shelterId)
      )
    )
    .limit(1);
  return !!row;
}

/**
 * Stats agrégées pour l'index : nombre de chats dispo par refuge.
 */
export async function getSheltersWithStats() {
  const rows = await db
    .select({
      shelter: shelters,
      available: sql<number>`
        coalesce((select count(*) from ${pets}
                  where ${pets.shelterId} = ${shelters.id}
                  and ${pets.status} = 'disponible'), 0)
      `,
      adopted: sql<number>`
        coalesce((select count(*) from ${pets}
                  where ${pets.shelterId} = ${shelters.id}
                  and ${pets.status} = 'adopte'), 0)
      `,
    })
    .from(shelters)
    .orderBy(shelters.name);
  return rows.map((r) => ({
    shelter: r.shelter,
    available: Number(r.available),
    adopted: Number(r.adopted),
  }));
}

export interface GlobalShelterStats {
  total: number;
  verified: number;
}

/**
 * Compteurs publics pour la home : nombre total et nombre vérifiés.
 */
export async function getGlobalShelterStats(): Promise<GlobalShelterStats> {
  const [counts] = await db
    .select({
      total: sql<number>`count(*)`,
      verified: sql<number>`count(*) FILTER (WHERE ${shelters.isVerified} = true)`,
    })
    .from(shelters);
  return {
    total: Number(counts?.total ?? 0),
    verified: Number(counts?.verified ?? 0),
  };
}

/**
 * Refuges dans un rayon autour d'un point (ville), triés par distance.
 */
export async function getSheltersNearPoint(
  lat: number,
  lng: number,
  radiusKm: number,
  limit = 20
) {
  const meters = radiusKm * 1000;
  return db
    .select({
      shelter: shelters,
      distanceMeters: sql<number>`ST_Distance(
        ${shelters.location}::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      )`.as("distance_meters"),
    })
    .from(shelters)
    .where(
      and(
        sql`${shelters.location} IS NOT NULL`,
        sql`ST_DWithin(
          ${shelters.location}::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${meters}
        )`
      )
    )
    .orderBy(sql`distance_meters`)
    .limit(limit);
}
