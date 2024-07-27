import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@infra/db";
import {
  pensions,
  pensionPhotos,
  pensionReviews,
  pensionContactEvents,
} from "@/server/db/schema";

export const PENSION_SERVICE_KEYS = [
  "medication",
  "grooming",
  "outdoorAccess",
  "nightStaff",
  "transport",
  "senior",
] as const;

export type PensionServiceKey = (typeof PENSION_SERVICE_KEYS)[number];

export interface PensionListFilters {
  acceptsCats?: boolean;
  acceptsDogs?: boolean;
  /** Prix max/jour chat (€) — filtre uniquement si acceptsCats=true. */
  maxPriceCat?: number;
  /** Prix max/jour chien (€) — filtre uniquement si acceptsDogs=true. */
  maxPriceDog?: number;
  /** Services obligatoires : la pension doit cocher TOUS les services demandés. */
  services?: PensionServiceKey[];
  search?: string;
}

/**
 * Annuaire public — n'expose que les pensions vérifiées par un admin
 * plateforme. Tant qu'un SIRET n'est pas contrôlé, la fiche reste invisible
 * (protection contre les faux profils).
 */
export async function getPensions(filters: PensionListFilters = {}) {
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
    // jsonb @> : la pension doit contenir tous les services à true
    const required = Object.fromEntries(
      filters.services.map((s) => [s, true])
    );
    conditions.push(
      sql`${pensions.services} @> ${JSON.stringify(required)}::jsonb`
    );
  }

  if (filters.search && filters.search.trim().length > 0) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      sql`(${pensions.name} ILIKE ${term} OR ${pensions.address} ILIKE ${term})`
    );
  }

  return db
    .select()
    .from(pensions)
    .where(and(...conditions))
    .orderBy(asc(pensions.name));
}

export async function getPensionById(id: string) {
  const [row] = await db
    .select()
    .from(pensions)
    .where(eq(pensions.id, id))
    .limit(1);
  return row ?? null;
}

export async function getPensionBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(pensions)
    .where(eq(pensions.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function getPensionWithPhotos(slug: string) {
  const pension = await getPensionBySlug(slug);
  if (!pension) return null;
  const photos = await db
    .select()
    .from(pensionPhotos)
    .where(eq(pensionPhotos.pensionId, pension.id))
    .orderBy(asc(pensionPhotos.order));
  return { ...pension, photos };
}

/**
 * Récupère plusieurs pensions par leurs slugs — alimente le comparateur,
 * qui passe les sélections en query string. Toutes doivent être vérifiées.
 */
export async function getPensionsBySlugs(slugs: string[]) {
  if (slugs.length === 0) return [];
  const rows = await db
    .select()
    .from(pensions)
    .where(
      and(
        eq(pensions.isVerified, true),
        inArray(pensions.slug, slugs)
      )
    );
  // Préserve l'ordre demandé par le caller.
  const map = new Map(rows.map((r) => [r.slug, r]));
  return slugs.map((s) => map.get(s)).filter((r): r is NonNullable<typeof r> => !!r);
}

/**
 * Pensions vérifiées dans un rayon autour d'un point (km). Retourne
 * également la photo principale et la distance.
 */
export async function getPensionsNearPoint(
  lat: number,
  lng: number,
  radiusKm: number,
  limit = 30
) {
  const meters = radiusKm * 1000;
  const rows = await db
    .select({
      pension: pensions,
      distanceMeters: sql<number>`ST_Distance(
        ${pensions.location}::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      )`.as("distance_meters"),
    })
    .from(pensions)
    .where(
      and(
        eq(pensions.isVerified, true),
        sql`${pensions.location} IS NOT NULL`,
        sql`ST_DWithin(
          ${pensions.location}::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${meters}
        )`
      )
    )
    .orderBy(sql`distance_meters`)
    .limit(limit);

  return rows;
}

/**
 * Queue admin : les pensions créées mais pas encore vérifiées. Utilisé
 * dans `/admin/pensions` pour passer en revue les SIRET et agréments.
 */
export async function getUnverifiedPensions() {
  return db
    .select()
    .from(pensions)
    .where(eq(pensions.isVerified, false))
    .orderBy(asc(pensions.createdAt));
}

export interface GlobalPensionStats {
  verified: number;
  cats: number;
  dogs: number;
}

/**
 * Compteurs publics — uniquement les pensions vérifiées (les seules
 * visibles à l'extérieur).
 */
export async function getGlobalPensionStats(): Promise<GlobalPensionStats> {
  const [counts] = await db
    .select({
      verified: sql<number>`count(*) FILTER (WHERE ${pensions.isVerified} = true)`,
      cats: sql<number>`count(*) FILTER (WHERE ${pensions.isVerified} = true AND ${pensions.acceptsCats} = true)`,
      dogs: sql<number>`count(*) FILTER (WHERE ${pensions.isVerified} = true AND ${pensions.acceptsDogs} = true)`,
    })
    .from(pensions);
  return {
    verified: Number(counts?.verified ?? 0),
    cats: Number(counts?.cats ?? 0),
    dogs: Number(counts?.dogs ?? 0),
  };
}

// ─── Avis ─────────────────────────────────────────────────────────────────

export interface RatingSummary {
  pensionId: string;
  average: number;
  count: number;
}

/**
 * Stats d'avis publiés par pension — utilisé pour afficher les étoiles
 * sur les cards/détail. Renvoie une map par pensionId.
 */
export async function getRatingSummariesForPensions(
  pensionIds: string[]
): Promise<Map<string, RatingSummary>> {
  if (pensionIds.length === 0) return new Map();
  const rows = await db
    .select({
      pensionId: pensionReviews.pensionId,
      average: sql<number>`AVG(${pensionReviews.rating})`,
      count: sql<number>`count(*)`,
    })
    .from(pensionReviews)
    .where(
      and(
        inArray(pensionReviews.pensionId, pensionIds),
        eq(pensionReviews.isPublished, true)
      )
    )
    .groupBy(pensionReviews.pensionId);

  return new Map(
    rows.map((r) => [
      r.pensionId,
      {
        pensionId: r.pensionId,
        average: Number(r.average ?? 0),
        count: Number(r.count ?? 0),
      },
    ])
  );
}

export interface PensionReviewWithAuthor {
  id: string;
  rating: number;
  comment: string | null;
  isVerified: boolean;
  createdAt: Date;
  authorName: string;
  authorImage: string | null;
}

/**
 * Avis publiés d'une pension, plus récents en premier. Joint le nom et
 * l'avatar de l'auteur (sans l'email — on ne fuite rien d'identifiant).
 */
export async function getPensionReviews(
  pensionId: string,
  limit = 50
): Promise<PensionReviewWithAuthor[]> {
  const rows = await db
    .select({
      id: pensionReviews.id,
      rating: pensionReviews.rating,
      comment: pensionReviews.comment,
      isVerified: pensionReviews.isVerified,
      createdAt: pensionReviews.createdAt,
      authorName: sql<string>`u.name`,
      authorImage: sql<string | null>`u.image`,
    })
    .from(pensionReviews)
    .innerJoin(sql`users u`, sql`u.id = ${pensionReviews.userId}`)
    .where(
      and(
        eq(pensionReviews.pensionId, pensionId),
        eq(pensionReviews.isPublished, true)
      )
    )
    .orderBy(desc(pensionReviews.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    rating: Number(r.rating),
    comment: r.comment,
    isVerified: r.isVerified,
    createdAt: r.createdAt,
    authorName: r.authorName,
    authorImage: r.authorImage,
  }));
}

/**
 * Indique si l'utilisateur peut laisser un avis sur cette pension :
 *   - existing : son avis actuel, le cas échéant
 *   - canSubmit : a-t-il droit de poster (true s'il n'a pas déjà posté)
 *   - hasContact : a-t-il un événement de contact dans les 90 derniers
 *     jours pour cette pension (alimente le flag isVerified)
 */
export async function getReviewContext(
  pensionId: string,
  userId: string
): Promise<{
  existing: PensionReviewWithAuthor | null;
  canSubmit: boolean;
  hasContact: boolean;
}> {
  const [existingRow] = await db
    .select({
      id: pensionReviews.id,
      rating: pensionReviews.rating,
      comment: pensionReviews.comment,
      isVerified: pensionReviews.isVerified,
      createdAt: pensionReviews.createdAt,
      authorName: sql<string>`u.name`,
      authorImage: sql<string | null>`u.image`,
    })
    .from(pensionReviews)
    .innerJoin(sql`users u`, sql`u.id = ${pensionReviews.userId}`)
    .where(
      and(
        eq(pensionReviews.pensionId, pensionId),
        eq(pensionReviews.userId, userId)
      )
    )
    .limit(1);

  const [contactRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pensionContactEvents)
    .where(
      and(
        eq(pensionContactEvents.pensionId, pensionId),
        eq(pensionContactEvents.userId, userId),
        gte(
          pensionContactEvents.createdAt,
          sql<Date>`now() - interval '90 days'`
        )
      )
    );

  const hasContact = Number(contactRow?.count ?? 0) > 0;

  return {
    existing: existingRow
      ? {
          id: existingRow.id,
          rating: Number(existingRow.rating),
          comment: existingRow.comment,
          isVerified: existingRow.isVerified,
          createdAt: existingRow.createdAt,
          authorName: existingRow.authorName,
          authorImage: existingRow.authorImage,
        }
      : null,
    canSubmit: !existingRow,
    hasContact,
  };
}
