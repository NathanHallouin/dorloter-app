/**
 * Service pensions — logique métier des pensions professionnelles
 * agréées (chatteries, chenils).
 *
 * Voir docs/SERVICES-API.md pour la convention.
 *
 * Règle clé : seules les pensions `isVerified=true` sont visibles
 * publiquement. Une fiche en attente de vérification ne fuite jamais
 * via cette surface — c'est filtré dans la WHERE-clause de toutes
 * les méthodes de ce service.
 */

import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@infra/db";
import { notFound, validationFailed } from "@infra/api/errors";
import { decodeCursor, encodeCursor } from "@infra/api/cursor";
import {
  pensions,
  pensionPhotos,
  pensionReviews,
} from "@/server/db/schema";
import {
  PENSION_SERVICE_KEYS,
  type PensionServiceKey,
} from "../queries";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PensionSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  acceptsCats: boolean;
  acceptsDogs: boolean;
  pricePerDayCat: string | null;
  pricePerDayDog: string | null;
  rating: { average: number; count: number } | null;
}

export interface PensionPhoto {
  id: string;
  url: string;
  blurDataUrl: string | null;
  isPrimary: boolean;
  order: number;
}

export interface PensionDetail extends PensionSummary {
  siret: string;
  agrementNumber: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  location: { latitude: number; longitude: number } | null;
  capacityCats: number | null;
  capacityDogs: number | null;
  services: Record<PensionServiceKey, boolean>;
  openingHours: string | null;
  photos: PensionPhoto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PensionListFilters {
  /** N'autorise que les pensions qui acceptent les chats. */
  acceptsCats?: boolean;
  /** N'autorise que celles qui acceptent les chiens. */
  acceptsDogs?: boolean;
  /** Plafond prix/jour chat (€). Filtre uniquement avec acceptsCats. */
  maxPriceCat?: number;
  /** Plafond prix/jour chien (€). Filtre uniquement avec acceptsDogs. */
  maxPriceDog?: number;
  /** Ensemble de services obligatoires (la pension doit TOUS les avoir). */
  services?: PensionServiceKey[];
  /** Recherche dans nom + adresse. */
  search?: string;
}

export interface PensionListResult {
  pensions: PensionSummary[];
  nextCursor: string | null;
}

interface CursorPayload {
  /** Sort key : `name ASC, id ASC` (annuaire). */
  name: string;
  id: string;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ─── listPensions ──────────────────────────────────────────────────────────

/**
 * Liste paginée des pensions vérifiées. Tri alphabétique. Cursor sur
 * `(name, id)` ASC.
 *
 * Filtres : espèce acceptée, prix max par jour, services obligatoires
 * (jsonb @>), recherche texte. Note moyenne et nombre d'avis joints
 * inline via sous-selects.
 */
export async function listPensions(input: {
  filters?: PensionListFilters;
  cursor?: string | null;
  limit?: number;
}): Promise<PensionListResult> {
  const filters = input.filters ?? {};
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);

  const conditions = [eq(pensions.isVerified, true)];

  if (filters.acceptsCats) conditions.push(eq(pensions.acceptsCats, true));
  if (filters.acceptsDogs) conditions.push(eq(pensions.acceptsDogs, true));

  if (filters.maxPriceCat !== undefined && filters.acceptsCats) {
    conditions.push(
      sql`(${pensions.pricePerDayCat} IS NULL OR ${pensions.pricePerDayCat} <= ${filters.maxPriceCat})`
    );
  }
  if (filters.maxPriceDog !== undefined && filters.acceptsDogs) {
    conditions.push(
      sql`(${pensions.pricePerDayDog} IS NULL OR ${pensions.pricePerDayDog} <= ${filters.maxPriceDog})`
    );
  }

  if (filters.services && filters.services.length > 0) {
    // Validation : tous les keys doivent être connus (sinon throw —
    // évite injection arbitraire dans le jsonb)
    for (const key of filters.services) {
      if (!PENSION_SERVICE_KEYS.includes(key)) {
        throw validationFailed(`Service inconnu : ${key}`);
      }
    }
    const required = Object.fromEntries(
      filters.services.map((s) => [s, true])
    );
    conditions.push(
      sql`${pensions.services} @> ${JSON.stringify(required)}::jsonb`
    );
  }

  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      or(ilike(pensions.name, term), ilike(pensions.address, term))!
    );
  }

  if (input.cursor) {
    const c = decodeCursor<CursorPayload>(input.cursor);
    conditions.push(
      sql`(${pensions.name}, ${pensions.id}) > (${c.name}, ${c.id}::uuid)`
    );
  }

  const rows = await db
    .select({
      id: pensions.id,
      slug: pensions.slug,
      name: pensions.name,
      description: pensions.description,
      address: pensions.address,
      logoUrl: pensions.logoUrl,
      coverUrl: pensions.coverUrl,
      acceptsCats: pensions.acceptsCats,
      acceptsDogs: pensions.acceptsDogs,
      pricePerDayCat: pensions.pricePerDayCat,
      pricePerDayDog: pensions.pricePerDayDog,
      ratingAvg: sql<number | null>`(
        SELECT AVG(rating)::float FROM ${pensionReviews}
        WHERE ${pensionReviews.pensionId} = ${pensions.id}
          AND ${pensionReviews.isPublished} = true
      )`,
      ratingCount: sql<number>`(
        SELECT count(*) FROM ${pensionReviews}
        WHERE ${pensionReviews.pensionId} = ${pensions.id}
          AND ${pensionReviews.isPublished} = true
      )`,
    })
    .from(pensions)
    .where(and(...conditions))
    .orderBy(asc(pensions.name), asc(pensions.id))
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
    pensions: page.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      address: r.address,
      logoUrl: r.logoUrl,
      coverUrl: r.coverUrl,
      acceptsCats: r.acceptsCats,
      acceptsDogs: r.acceptsDogs,
      pricePerDayCat: r.pricePerDayCat,
      pricePerDayDog: r.pricePerDayDog,
      rating:
        Number(r.ratingCount) > 0
          ? {
              average: Number(r.ratingAvg ?? 0),
              count: Number(r.ratingCount),
            }
          : null,
    })),
    nextCursor,
  };
}

// ─── getPensionBySlug ──────────────────────────────────────────────────────

/**
 * Fiche détaillée d'une pension par son slug. Photos, services jsonb
 * normalisés, note moyenne, coordonnées complètes.
 *
 * Throw `NOT_FOUND` si :
 *   - slug malformé
 *   - aucune pension correspondante OU pension non-vérifiée
 *     (volontairement traité comme 404 pour ne pas distinguer le
 *     "n'existe pas" du "en attente de vérification" — la fiche admin
 *     est accessible via un autre chemin)
 */
export async function getPensionBySlug(slug: string): Promise<PensionDetail> {
  if (!SLUG_RE.test(slug) || slug.length > 255) {
    throw notFound("Pension", slug);
  }

  const [pension] = await db
    .select()
    .from(pensions)
    .where(and(eq(pensions.slug, slug), eq(pensions.isVerified, true)))
    .limit(1);

  if (!pension) {
    throw notFound("Pension", slug);
  }

  const [photos, ratingRow] = await Promise.all([
    db
      .select()
      .from(pensionPhotos)
      .where(eq(pensionPhotos.pensionId, pension.id))
      .orderBy(asc(pensionPhotos.order)),
    db
      .select({
        avg: sql<number | null>`AVG(rating)::float`,
        count: sql<number>`count(*)`,
      })
      .from(pensionReviews)
      .where(
        and(
          eq(pensionReviews.pensionId, pension.id),
          eq(pensionReviews.isPublished, true)
        )
      ),
  ]);

  const rating =
    ratingRow[0] && Number(ratingRow[0].count) > 0
      ? {
          average: Number(ratingRow[0].avg ?? 0),
          count: Number(ratingRow[0].count),
        }
      : null;

  // Normalise services : on retourne TOUS les keys connus, même si
  // jsonb stocke partiellement. Évite de devoir gérer "absent vs false"
  // côté client.
  const rawServices = (pension.services ?? {}) as Record<string, unknown>;
  const services = Object.fromEntries(
    PENSION_SERVICE_KEYS.map((key) => [key, rawServices[key] === true])
  ) as Record<PensionServiceKey, boolean>;

  return {
    id: pension.id,
    slug: pension.slug,
    name: pension.name,
    description: pension.description,
    siret: pension.siret,
    agrementNumber: pension.agrementNumber,
    address: pension.address,
    location: pension.location
      ? { latitude: pension.location.y, longitude: pension.location.x }
      : null,
    phone: pension.phone,
    email: pension.email,
    website: pension.website,
    logoUrl: pension.logoUrl,
    coverUrl: pension.coverUrl,
    acceptsCats: pension.acceptsCats,
    acceptsDogs: pension.acceptsDogs,
    capacityCats: pension.capacityCats,
    capacityDogs: pension.capacityDogs,
    pricePerDayCat: pension.pricePerDayCat,
    pricePerDayDog: pension.pricePerDayDog,
    services,
    openingHours: pension.openingHours,
    rating,
    photos: photos.map((p) => ({
      id: p.id,
      url: p.url,
      blurDataUrl: p.blurDataUrl,
      isPrimary: p.isPrimary,
      order: p.order,
    })),
    createdAt: pension.createdAt,
    updatedAt: pension.updatedAt,
  };
}
