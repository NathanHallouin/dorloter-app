import { db } from "@infra/db";
import { pets, petPhotos, favorites, shelters } from "@/server/db/schema";
import { and, eq, inArray, notInArray, sql, desc, asc, ilike } from "drizzle-orm";

interface PetFilters {
  shelterId?: string;
  species?: string;
  sex?: string;
  ageCategory?: string;
  breed?: string;
  okWithCats?: string;
  okWithDogs?: string;
  okWithChildren?: string;
  search?: string;
}

export async function getPets(filters: PetFilters = {}, limit = 20, offset = 0) {
  const conditions = [eq(pets.status, "disponible")];

  if (filters.shelterId) {
    conditions.push(eq(pets.shelterId, filters.shelterId));
  }
  if (filters.species && filters.species !== "all") {
    conditions.push(eq(pets.species, filters.species as "chat" | "chien"));
  }
  if (filters.sex && filters.sex !== "all") {
    conditions.push(eq(pets.sex, filters.sex as "male" | "femelle" | "inconnu"));
  }
  if (filters.ageCategory && filters.ageCategory !== "all") {
    conditions.push(
      eq(pets.ageCategory, filters.ageCategory as "chaton" | "jeune" | "adulte" | "senior")
    );
  }
  if (filters.okWithCats === "oui") {
    conditions.push(eq(pets.okWithCats, "oui"));
  }
  if (filters.okWithDogs === "oui") {
    conditions.push(eq(pets.okWithDogs, "oui"));
  }
  if (filters.okWithChildren === "oui") {
    conditions.push(eq(pets.okWithChildren, "oui"));
  }
  if (filters.search) {
    conditions.push(ilike(pets.name, `%${filters.search}%`));
  }

  const [results, countResult] = await Promise.all([
    db
      .select()
      .from(pets)
      .where(and(...conditions))
      .orderBy(desc(pets.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(pets)
      .where(and(...conditions)),
  ]);

  return {
    pets: results,
    total: Number(countResult[0]?.count ?? 0),
  };
}

export async function getPetById(id: string) {
  const results = await db
    .select()
    .from(pets)
    .where(eq(pets.id, id))
    .limit(1);
  return results[0] ?? null;
}

export async function getPetWithDetails(id: string) {
  const pet = await getPetById(id);
  if (!pet) return null;

  const [photos, shelter] = await Promise.all([
    db
      .select()
      .from(petPhotos)
      .where(eq(petPhotos.petId, id))
      .orderBy(asc(petPhotos.order)),
    db
      .select()
      .from(shelters)
      .where(eq(shelters.id, pet.shelterId))
      .limit(1),
  ]);

  return {
    ...pet,
    photos,
    shelter: shelter[0] ?? null,
  };
}

export async function getPetsByShelter(shelterId: string) {
  return db
    .select()
    .from(pets)
    .where(eq(pets.shelterId, shelterId))
    .orderBy(desc(pets.createdAt));
}

/**
 * "Vous pourriez aimer aussi" — animaux similaires affichés en bas d'une
 * fiche.
 *
 * Heuristique : même espèce + même catégorie d'âge si possible, sinon même
 * espèce. On exclut le pet courant et on privilégie le même refuge en
 * priorité (les adoptants ont souvent un attachement à un refuge en
 * particulier), puis on complète avec d'autres refuges.
 *
 * Renvoie aussi la photo principale dans la même requête pour éviter un
 * round-trip N+1.
 */
export async function getSimilarPets(
  petId: string,
  options: {
    species: "chat" | "chien";
    ageCategory: "chaton" | "jeune" | "adulte" | "senior" | null;
    shelterId: string;
    limit?: number;
  }
) {
  const limit = options.limit ?? 4;

  const baseConditions = [
    eq(pets.status, "disponible"),
    eq(pets.species, options.species),
    sql`${pets.id} <> ${petId}`,
  ];

  // Tri : refuge identique d'abord, puis catégorie d'âge identique, puis
  // récence. Coalesce pour gérer ageCategory null.
  const ageMatchExpr = options.ageCategory
    ? sql<number>`CASE WHEN ${pets.ageCategory} = ${options.ageCategory} THEN 0 ELSE 1 END`
    : sql<number>`0`;
  const shelterMatchExpr = sql<number>`CASE WHEN ${pets.shelterId} = ${options.shelterId} THEN 0 ELSE 1 END`;

  const rows = await db
    .select({
      pet: pets,
      photoUrl: sql<string | null>`(
        select url from ${petPhotos}
        where ${petPhotos.petId} = ${pets.id}
          and ${petPhotos.isPrimary} = true
        limit 1
      )`,
    })
    .from(pets)
    .where(and(...baseConditions))
    .orderBy(shelterMatchExpr, ageMatchExpr, desc(pets.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    pet: r.pet,
    photoUrl: r.photoUrl,
  }));
}

export async function getPetPhotos(petId: string) {
  return db
    .select()
    .from(petPhotos)
    .where(eq(petPhotos.petId, petId))
    .orderBy(asc(petPhotos.order));
}

/**
 * Chats disponibles dans un rayon autour d'un point (ville).
 * Retourne aussi la photo principale + le refuge + la distance.
 */
export async function getPetsNearPoint(
  lat: number,
  lng: number,
  radiusKm: number,
  limit = 40
) {
  const meters = radiusKm * 1000;

  const rows = await db
    .select({
      pet: pets,
      shelterId: shelters.id,
      shelterName: shelters.name,
      distanceMeters: sql<number>`ST_Distance(
        ${shelters.location}::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      )`.as("distance_meters"),
    })
    .from(pets)
    .innerJoin(shelters, eq(shelters.id, pets.shelterId))
    .where(
      and(
        eq(pets.status, "disponible"),
        sql`ST_DWithin(
          ${shelters.location}::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${meters}
        )`
      )
    )
    .orderBy(sql`distance_meters`)
    .limit(limit);

  if (rows.length === 0)
    return { pets: [] as typeof rows, photoMap: new Map<string, string>() };

  const petIds = rows.map((r) => r.pet.id);
  const photos = await db
    .select({ petId: petPhotos.petId, url: petPhotos.url })
    .from(petPhotos)
    .where(
      and(inArray(petPhotos.petId, petIds), eq(petPhotos.isPrimary, true))
    );

  return {
    pets: rows,
    photoMap: new Map(photos.map((p) => [p.petId, p.url])),
  };
}

/**
 * Nombre de chats disponibles autour d'un point. Plus léger que la liste
 * complète — utilisé pour l'index des villes.
 */
export async function countPetsNearPoint(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<number> {
  const meters = radiusKm * 1000;
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pets)
    .innerJoin(shelters, eq(shelters.id, pets.shelterId))
    .where(
      and(
        eq(pets.status, "disponible"),
        sql`ST_DWithin(
          ${shelters.location}::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${meters}
        )`
      )
    );
  return Number(row?.count ?? 0);
}

/**
 * Pour le mode swipe : récupère les chats disponibles non encore favoris de
 * l'utilisateur, avec leur photo principale et le nom du refuge. Limite à 30.
 */
export async function getSwipeablePets(userId: string | null, limit = 30) {
  const conditions = [eq(pets.status, "disponible")];

  if (userId) {
    const existingFavorites = await db
      .select({ petId: favorites.petId })
      .from(favorites)
      .where(eq(favorites.userId, userId));
    const favIds = existingFavorites.map((f) => f.petId);
    if (favIds.length > 0) {
      conditions.push(notInArray(pets.id, favIds));
    }
  }

  const rows = await db
    .select({
      pet: pets,
      shelterName: shelters.name,
    })
    .from(pets)
    .innerJoin(shelters, eq(shelters.id, pets.shelterId))
    .where(and(...conditions))
    .orderBy(desc(pets.createdAt))
    .limit(limit);

  if (rows.length === 0) return [];

  const petIds = rows.map((r) => r.pet.id);
  const photos = await db
    .select()
    .from(petPhotos)
    .where(
      and(inArray(petPhotos.petId, petIds), eq(petPhotos.isPrimary, true))
    );
  const photoMap = new Map(photos.map((p) => [p.petId, p.url]));

  return rows.map((r) => ({
    pet: r.pet,
    shelterName: r.shelterName,
    primaryPhotoUrl: photoMap.get(r.pet.id) ?? null,
  }));
}
