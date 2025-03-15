/**
 * Service pets — logique métier pure du domaine adoption pour les
 * opérations sur les animaux.
 *
 * Pourquoi "service" et pas "query" ou "action" :
 *   - les `queries/` sont des accès lecture sans logique de domaine
 *     (juste du SQL)
 *   - les `actions/` sont des Server Actions Next.js avec
 *     `revalidatePath`, validation FormData, retour ActionResponse
 *   - les services sont la **source de vérité métier** : ils throw des
 *     `DomainError` sur les cas métier (introuvable, déjà candidaté,
 *     refuge non vérifié), ils orchestrent les queries, ils ne
 *     connaissent rien de Next.js
 *
 * Les Server Actions (web) deviennent des coquilles fines qui appellent
 * ces services puis catch/format. Les routes `/api/v1/*` (mobile) font
 * exactement pareil. Une seule source de vérité métier, deux clients.
 *
 * Voir docs/SERVICES-API.md pour la convention complète.
 */

import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@infra/db";
import { notFound } from "@infra/api/errors";
import { decodeCursor, encodeCursor } from "@infra/api/cursor";
import { pets, petPhotos, shelters } from "@/server/db/schema";
import * as petQueries from "../queries/pets";
import type { Pet, PetPhoto } from "@/types";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PetWithDetails extends Pet {
  photos: PetPhoto[];
  shelter: {
    id: string;
    name: string;
    slug: string;
    address: string | null;
    isVerified: boolean;
  } | null;
}

export interface PetSummary {
  id: string;
  species: "chat" | "chien";
  name: string;
  breed: string | null;
  color: string | null;
  sex: "male" | "femelle" | "inconnu";
  ageCategory: "chaton" | "jeune" | "adulte" | "senior" | null;
  status: "pre_adoptable" | "disponible" | "reserve" | "adopte" | "retire";
  adoptionFee: string | null;
  primaryPhoto: { url: string; blurDataUrl: string | null } | null;
  shelter: { id: string; slug: string; name: string } | null;
  createdAt: Date;
}

export interface PetListFilters {
  species?: "chat" | "chien";
  sex?: "male" | "femelle" | "inconnu";
  ageCategory?: "chaton" | "jeune" | "adulte" | "senior";
  okWithCats?: boolean;
  okWithDogs?: boolean;
  okWithChildren?: boolean;
  shelterId?: string;
  search?: string;
  /** Restreint la liste à ces ids. Quand fourni, désactive le filtre
   *  `status='disponible'` (utile pour "mes favoris" qui peuvent contenir
   *  des animaux déjà réservés/adoptés). */
  petIds?: string[];
}

export interface PetListResult {
  pets: PetSummary[];
  /** Cursor à passer pour la page suivante. `null` si fin de liste. */
  nextCursor: string | null;
}

interface CursorPayload {
  ts: string; // ISO date-time
  id: string; // UUID
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Récupère un animal par son id, avec photos et refuge.
 *
 * Throw `NOT_FOUND` si :
 *   - l'id n'est pas un UUID valide
 *   - aucun pet ne correspond
 *   - le pet est en statut `retire` (équivalent supprimé pour le public)
 */
export async function getPetWithDetails(id: string): Promise<PetWithDetails> {
  if (!UUID_RE.test(id)) {
    throw notFound("Animal", id);
  }

  const pet = await petQueries.getPetWithDetails(id);
  if (!pet) {
    throw notFound("Animal", id);
  }

  if (pet.status === "retire") {
    // Statut "retire" = équivalent supprimé côté public (modération a
    // décidé de cacher la fiche). 410 plutôt que 404 serait plus précis,
    // mais on garde 404 pour ne pas distinguer un retrait d'une vraie
    // absence — c'est l'intention de la modération.
    throw notFound("Animal", id);
  }

  return {
    ...pet,
    shelter: pet.shelter
      ? {
          id: pet.shelter.id,
          name: pet.shelter.name,
          slug: pet.shelter.slug,
          address: pet.shelter.address,
          isVerified: pet.shelter.isVerified,
        }
      : null,
  };
}

/**
 * Liste paginée des animaux à adopter (statut `disponible` uniquement).
 *
 * Pagination cursor-based sur `(createdAt DESC, id DESC)` — stable même
 * si de nouveaux pets sont publiés pendant le scroll.
 *
 * Photo principale et refuge minimal joints inline (sous-selects). Pas
 * de N+1 même sur de grosses listes.
 *
 * `limit` est plafonné à 100 côté serveur — le client mobile peut
 * demander une grosse page mais on ne fait jamais sauter la barrière.
 */
export async function listPets(input: {
  filters?: PetListFilters;
  cursor?: string | null;
  limit?: number;
}): Promise<PetListResult> {
  const filters = input.filters ?? {};
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);

  // `status='disponible'` est le défaut, mais on l'omet quand le caller
  // restreint par `petIds` (cas "mes favoris" — on veut voir l'état réel
  // même si l'animal a été adopté entre-temps).
  const conditions =
    filters.petIds && filters.petIds.length > 0
      ? []
      : [eq(pets.status, "disponible")];

  if (filters.petIds && filters.petIds.length > 0) {
    conditions.push(inArray(pets.id, filters.petIds));
  }

  if (filters.species) conditions.push(eq(pets.species, filters.species));
  if (filters.sex) conditions.push(eq(pets.sex, filters.sex));
  if (filters.ageCategory) {
    conditions.push(eq(pets.ageCategory, filters.ageCategory));
  }
  if (filters.okWithCats) conditions.push(eq(pets.okWithCats, "oui"));
  if (filters.okWithDogs) conditions.push(eq(pets.okWithDogs, "oui"));
  if (filters.okWithChildren) {
    conditions.push(eq(pets.okWithChildren, "oui"));
  }
  if (filters.shelterId) {
    conditions.push(eq(pets.shelterId, filters.shelterId));
  }
  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      or(ilike(pets.name, term), ilike(pets.description, term))!
    );
  }

  // Cursor : tuple (createdAt, id) — comparaison lexicographique en SQL.
  // Pour DESC, on veut les pets STRICTEMENT antérieurs au cursor.
  if (input.cursor) {
    const c = decodeCursor<CursorPayload>(input.cursor);
    conditions.push(
      sql`(${pets.createdAt}, ${pets.id}) < (${new Date(c.ts)}, ${c.id}::uuid)`
    );
  }

  // On demande limit+1 pour savoir s'il reste une page suivante (sans
  // COUNT séparé qui serait coûteux sur grosse table).
  const rows = await db
    .select({
      id: pets.id,
      species: pets.species,
      name: pets.name,
      breed: pets.breed,
      color: pets.color,
      sex: pets.sex,
      ageCategory: pets.ageCategory,
      status: pets.status,
      adoptionFee: pets.adoptionFee,
      createdAt: pets.createdAt,
      photoUrl: sql<string | null>`(
        SELECT url FROM ${petPhotos}
        WHERE ${petPhotos.petId} = ${pets.id}
          AND ${petPhotos.isPrimary} = true
        LIMIT 1
      )`,
      photoBlur: sql<string | null>`(
        SELECT blur_data_url FROM ${petPhotos}
        WHERE ${petPhotos.petId} = ${pets.id}
          AND ${petPhotos.isPrimary} = true
        LIMIT 1
      )`,
      shelterId: shelters.id,
      shelterSlug: shelters.slug,
      shelterName: shelters.name,
    })
    .from(pets)
    .leftJoin(shelters, eq(shelters.id, pets.shelterId))
    .where(and(...conditions))
    .orderBy(desc(pets.createdAt), desc(pets.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const nextCursor = hasMore
    ? (() => {
        const last = page[page.length - 1]!;
        return encodeCursor<CursorPayload>({
          ts: last.createdAt.toISOString(),
          id: last.id,
        });
      })()
    : null;

  const result: PetSummary[] = page.map((r) => ({
    id: r.id,
    species: r.species,
    name: r.name,
    breed: r.breed,
    color: r.color,
    sex: r.sex,
    ageCategory: r.ageCategory,
    status: r.status,
    adoptionFee: r.adoptionFee,
    primaryPhoto: r.photoUrl
      ? { url: r.photoUrl, blurDataUrl: r.photoBlur }
      : null,
    shelter: r.shelterId
      ? {
          id: r.shelterId,
          slug: r.shelterSlug ?? "",
          name: r.shelterName ?? "",
        }
      : null,
    createdAt: r.createdAt,
  }));

  return { pets: result, nextCursor };
}

/**
 * Animaux similaires à un pet donné — pour la section "Vous pourriez
 * aimer aussi" sur la fiche détail.
 *
 * Algorithme dans la query (même espèce, exclut self, priorise même
 * refuge puis même catégorie d'âge). Pas de pagination — on retourne
 * 4 items par défaut.
 *
 * Throw `NOT_FOUND` si le pet de référence n'existe pas (ou est retiré).
 */
export async function getSimilarPets(
  petId: string,
  options: { limit?: number } = {}
): Promise<PetSummary[]> {
  if (!UUID_RE.test(petId)) {
    throw notFound("Animal", petId);
  }

  // On a besoin de species + ageCategory + shelterId pour la query
  // existante. Petite double-fetch acceptable, on est lecture cache-able.
  const reference = await petQueries.getPetById(petId);
  if (!reference || reference.status === "retire") {
    throw notFound("Animal", petId);
  }

  const limit = Math.min(Math.max(options.limit ?? 4, 1), 12);
  const rows = await petQueries.getSimilarPets(petId, {
    species: reference.species,
    ageCategory: reference.ageCategory,
    shelterId: reference.shelterId,
    limit,
  });

  return rows.map((r) => ({
    id: r.pet.id,
    species: r.pet.species,
    name: r.pet.name,
    breed: r.pet.breed,
    color: r.pet.color,
    sex: r.pet.sex,
    ageCategory: r.pet.ageCategory,
    status: r.pet.status,
    adoptionFee: r.pet.adoptionFee,
    primaryPhoto: r.photoUrl ? { url: r.photoUrl, blurDataUrl: null } : null,
    shelter: null, // pas joint par la query similar — pas critique pour la card
    createdAt: r.pet.createdAt,
  }));
}
