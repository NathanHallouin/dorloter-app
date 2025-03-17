import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@infra/db";
import {
  pets,
  petPhotos,
  shelters,
  users,
  savedSearches,
} from "@/server/db/schema";

export interface DigestPet {
  id: string;
  name: string;
  species: "chat" | "chien";
  breed: string | null;
  ageCategory: string | null;
  shelterId: string;
  shelterName: string;
  shelterSlug: string;
  primaryPhotoUrl: string | null;
  distanceKm: number;
  publishedAt: Date;
}

export interface DigestRecipient {
  userId: string;
  email: string;
  name: string;
  pushSubscription: unknown | null;
  pets: DigestPet[];
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  pushSubscription: unknown | null;
  lat: number;
  lng: number;
  radiusKm: number;
}

/**
 * Tous les users géolocalisés avec leur rayon (par défaut 10 km).
 * Servira de base à l'itération du cron — un appel SQL pour la liste,
 * puis une query par user pour pinger ses pets proches.
 */
export async function listGeolocatedUsers(): Promise<UserRow[]> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      pushSubscription: users.pushSubscription,
      radiusKm: users.notificationRadiusKm,
      lng: sql<number>`ST_X(${users.location}::geometry)`.as("lng"),
      lat: sql<number>`ST_Y(${users.location}::geometry)`.as("lat"),
    })
    .from(users)
    .where(sql`${users.location} IS NOT NULL`);

  return rows
    .filter((r) => r.lat != null && r.lng != null)
    .map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      pushSubscription: r.pushSubscription,
      lat: r.lat,
      lng: r.lng,
      radiusKm: r.radiusKm ?? 10,
    }));
}

/**
 * Espèces préférées par l'utilisateur selon ses saved searches d'adoption
 * actives. Si aucune préférence connue, on garde les deux.
 */
async function preferredSpeciesFor(
  userId: string
): Promise<Array<"chat" | "chien">> {
  const rows = await db
    .select({ params: savedSearches.params })
    .from(savedSearches)
    .where(
      and(
        eq(savedSearches.userId, userId),
        eq(savedSearches.kind, "adoption"),
        eq(savedSearches.isActive, true)
      )
    );
  const set = new Set<"chat" | "chien">();
  for (const r of rows) {
    const p = r.params as { species?: string } | null;
    if (p?.species === "chat" || p?.species === "chien") set.add(p.species);
  }
  if (set.size === 0) {
    set.add("chat");
    set.add("chien");
  }
  return Array.from(set);
}

/**
 * Sélectionne jusqu'à `limit` pets récemment publiés (status `disponible`,
 * créés depuis `sinceDays` jours) dans le rayon `radiusKm` autour du point,
 * filtrés par les espèces souhaitées.
 *
 * Tri : récent d'abord, puis distance.
 */
export async function getRecentNearbyPets(opts: {
  lat: number;
  lng: number;
  radiusKm: number;
  species: Array<"chat" | "chien">;
  sinceDays: number;
  limit: number;
}): Promise<DigestPet[]> {
  const { lat, lng, radiusKm, species, sinceDays, limit } = opts;
  if (species.length === 0) return [];
  const meters = radiusKm * 1000;

  const rows = await db
    .select({
      id: pets.id,
      name: pets.name,
      species: pets.species,
      breed: pets.breed,
      ageCategory: pets.ageCategory,
      createdAt: pets.createdAt,
      shelterId: shelters.id,
      shelterName: shelters.name,
      shelterSlug: shelters.slug,
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
        inArray(pets.species, species),
        sql`${pets.createdAt} > NOW() - INTERVAL '${sql.raw(String(sinceDays))} days'`,
        sql`ST_DWithin(
          ${shelters.location}::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${meters}
        )`
      )
    )
    .orderBy(sql`${pets.createdAt} DESC`, sql`distance_meters ASC`)
    .limit(limit);

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const photos = await db
    .select({ petId: petPhotos.petId, url: petPhotos.url })
    .from(petPhotos)
    .where(
      and(inArray(petPhotos.petId, ids), eq(petPhotos.isPrimary, true))
    );
  const photoMap = new Map(photos.map((p) => [p.petId, p.url]));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    species: r.species,
    breed: r.breed,
    ageCategory: r.ageCategory,
    shelterId: r.shelterId,
    shelterName: r.shelterName,
    shelterSlug: r.shelterSlug,
    primaryPhotoUrl: photoMap.get(r.id) ?? null,
    distanceKm: Math.round((r.distanceMeters / 1000) * 10) / 10,
    publishedAt: r.createdAt,
  }));
}

/**
 * Construit la liste des destinataires du digest hebdo : pour chaque user
 * géolocalisé, calcule ses pets éligibles. N'inclut que les users avec
 * au moins un pet à proposer (pas de digest vide).
 */
export async function buildWeeklyDigestRecipients(opts: {
  sinceDays?: number;
  perUserLimit?: number;
}): Promise<DigestRecipient[]> {
  const sinceDays = opts.sinceDays ?? 7;
  const perUserLimit = opts.perUserLimit ?? 3;

  const candidates = await listGeolocatedUsers();
  const recipients: DigestRecipient[] = [];

  for (const u of candidates) {
    const species = await preferredSpeciesFor(u.id);
    const pets = await getRecentNearbyPets({
      lat: u.lat,
      lng: u.lng,
      radiusKm: u.radiusKm,
      species,
      sinceDays,
      limit: perUserLimit,
    });
    if (pets.length > 0) {
      recipients.push({
        userId: u.id,
        email: u.email,
        name: u.name,
        pushSubscription: u.pushSubscription,
        pets,
      });
    }
  }

  return recipients;
}
