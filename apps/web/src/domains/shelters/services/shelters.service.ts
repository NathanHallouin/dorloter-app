/**
 * Service shelters — logique métier pure pour les opérations refuges.
 *
 * Voir docs/SERVICES-API.md pour la convention.
 */

import { and, desc, eq, ilike, lt, or, sql } from "drizzle-orm";
import { db } from "@infra/db";
import { notFound, validationFailed } from "@infra/api/errors";
import { decodeCursor, encodeCursor } from "@infra/api/cursor";
import { pets, shelterFollows, shelters } from "@/server/db/schema";
import * as shelterQueries from "../queries";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ShelterSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  isVerified: boolean;
  foundedYear: number | null;
  /** Nombre d'animaux à adopter actuellement. */
  available: number;
  /** Nombre d'adoptions concrétisées (cumulé). */
  adopted: number;
  createdAt: Date;
}

export interface ShelterDetail extends ShelterSummary {
  missionLong: string | null;
  siret: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  donationUrl: string | null;
  donationLabel: string | null;
  donationDescription: string | null;
  visitHours: string | null;
  location: { latitude: number; longitude: number } | null;
  /** Animaux réservés (en cours d'adoption). */
  reserved: number;
  /** Followers du refuge. */
  followers: number;
  updatedAt: Date;
}

export interface ShelterListFilters {
  /** Si true, ne retourne que les refuges vérifiés (badge admin). */
  verifiedOnly?: boolean;
  /** Recherche dans nom + description (ILIKE). */
  search?: string;
}

export interface ShelterListResult {
  shelters: ShelterSummary[];
  /** Cursor pour la page suivante. `null` si fin. */
  nextCursor: string | null;
}

interface CursorPayload {
  /** Sort key : `name ASC, id ASC` — le plus naturel pour un annuaire. */
  name: string;
  id: string;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Liste paginée des refuges. Tri par nom alphabétique (annuaire) — le
 * cursor encode `(name, id)` pour avancer page par page.
 *
 * Photos / cover joints inline. Compteurs `available` et `adopted`
 * calculés via sous-selects (PostgreSQL gère bien, indexé sur
 * `pets.shelterId`).
 *
 * Pour la cohérence avec l'expérience web où l'admin n'expose que
 * `isVerified=true`, le filtre `verifiedOnly=false` est seulement
 * possible côté admin (pas exposé en API publique pour le moment).
 */
export async function listShelters(input: {
  filters?: ShelterListFilters;
  cursor?: string | null;
  limit?: number;
}): Promise<ShelterListResult> {
  const filters = input.filters ?? {};
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);

  const conditions = [];
  if (filters.verifiedOnly) conditions.push(eq(shelters.isVerified, true));
  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      or(ilike(shelters.name, term), ilike(shelters.description, term))!
    );
  }

  if (input.cursor) {
    const c = decodeCursor<CursorPayload>(input.cursor);
    conditions.push(
      sql`(${shelters.name}, ${shelters.id}) > (${c.name}, ${c.id}::uuid)`
    );
  }

  const rows = await db
    .select({
      id: shelters.id,
      slug: shelters.slug,
      name: shelters.name,
      description: shelters.description,
      address: shelters.address,
      logoUrl: shelters.logoUrl,
      coverUrl: shelters.coverUrl,
      isVerified: shelters.isVerified,
      foundedYear: shelters.foundedYear,
      createdAt: shelters.createdAt,
      available: sql<number>`coalesce((
        SELECT count(*) FROM ${pets}
        WHERE ${pets.shelterId} = ${shelters.id}
          AND ${pets.status} = 'disponible'
      ), 0)`,
      adopted: sql<number>`coalesce((
        SELECT count(*) FROM ${pets}
        WHERE ${pets.shelterId} = ${shelters.id}
          AND ${pets.status} = 'adopte'
      ), 0)`,
    })
    .from(shelters)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(shelters.name, shelters.id)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const nextCursor = hasMore
    ? (() => {
        const last = page[page.length - 1]!;
        return encodeCursor<CursorPayload>({ name: last.name, id: last.id });
      })()
    : null;

  return {
    shelters: page.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      address: r.address,
      logoUrl: r.logoUrl,
      coverUrl: r.coverUrl,
      isVerified: r.isVerified,
      foundedYear: r.foundedYear,
      available: Number(r.available),
      adopted: Number(r.adopted),
      createdAt: r.createdAt,
    })),
    nextCursor,
  };
}

/**
 * Fiche détaillée d'un refuge par son slug. Inclut stats publiques (à
 * adopter / réservés / adoptés / followers) et coordonnées.
 *
 * Throw `NOT_FOUND` si :
 *   - slug malformé (sécurité — n'expose pas le SQL)
 *   - aucun refuge ne correspond
 *
 * Note : on retourne aussi les refuges non-vérifiés. C'est volontaire —
 * un refuge créé en attente de vérification doit être consultable par
 * son admin (qui partage le lien) et par l'équipe Dorloter pour
 * vérification. La page publique web filtre côté UI quand besoin.
 */
export async function getShelterBySlug(slug: string): Promise<ShelterDetail> {
  if (!SLUG_RE.test(slug) || slug.length > 255) {
    throw notFound("Refuge", slug);
  }

  const shelter = await shelterQueries.getShelterBySlug(slug);
  if (!shelter) {
    throw notFound("Refuge", slug);
  }

  const stats = await shelterQueries.getShelterPublicStats(shelter.id);

  return {
    id: shelter.id,
    slug: shelter.slug,
    name: shelter.name,
    description: shelter.description,
    missionLong: shelter.missionLong,
    siret: shelter.siret,
    foundedYear: shelter.foundedYear,
    address: shelter.address,
    location: shelter.location
      ? { latitude: shelter.location.y, longitude: shelter.location.x }
      : null,
    phone: shelter.phone,
    email: shelter.email,
    website: shelter.website,
    donationUrl: shelter.donationUrl,
    donationLabel: shelter.donationLabel,
    donationDescription: shelter.donationDescription,
    visitHours: shelter.visitHours,
    logoUrl: shelter.logoUrl,
    coverUrl: shelter.coverUrl,
    isVerified: shelter.isVerified,
    available: stats.available,
    reserved: stats.reserved,
    adopted: stats.adopted,
    followers: stats.followers,
    createdAt: shelter.createdAt,
    updatedAt: shelter.updatedAt,
  };
}
