import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@infra/db";
import {
  applications,
  pets,
  petPhotos,
  shelters,
  testimonials,
} from "@/server/db/schema";

export interface PublicTestimonial {
  id: string;
  content: string;
  photoUrl: string | null;
  createdAt: Date;
  /** Prénom de l'auteur (anonymisation RGPD). */
  authorFirstName: string;
  /** « Vérifié » : adoption acceptée depuis > 90 jours quand le témoignage a été posté. */
  isVerified: boolean;
  /** Jours écoulés depuis l'adoption (à la date du témoignage). */
  daysSinceAdoption: number | null;
  pet: {
    id: string;
    name: string;
    species: "chat" | "chien";
    photoUrl: string | null;
  };
  shelter: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface TestimonialFilters {
  species?: "chat" | "chien";
  shelterId?: string;
  /** Témoignages publiés depuis N jours (30, 90, 365 typiquement). */
  sinceDays?: number;
  /** Si true, ne renvoie que les témoignages "vérifiés" (90j post-adoption). */
  verifiedOnly?: boolean;
}

export interface TestimonialListResult {
  testimonials: PublicTestimonial[];
  total: number;
}

const VERIFIED_THRESHOLD_DAYS = 90;

/**
 * Liste paginée de témoignages publics avec filtres et statut vérifié.
 * Le statut vérifié est calculé via la date de la candidature `acceptee`
 * la plus récente (= proxy de la date d'adoption) comparée à la date du
 * témoignage : si > 90 jours, le témoignage est « vérifié ».
 */
export async function listTestimonials(
  filters: TestimonialFilters = {},
  limit = 18,
  offset = 0
): Promise<TestimonialListResult> {
  const conditions = [eq(testimonials.isPublished, true)];

  if (filters.species) {
    conditions.push(eq(pets.species, filters.species));
  }
  if (filters.shelterId) {
    conditions.push(eq(shelters.id, filters.shelterId));
  }
  if (filters.sinceDays && filters.sinceDays > 0) {
    const since = new Date(Date.now() - filters.sinceDays * 24 * 60 * 60 * 1000);
    conditions.push(gte(testimonials.createdAt, since));
  }

  // Sous-select pour le proxy de date d'adoption : `updatedAt` de la
  // candidature `acceptee` la plus récente sur le même couple (user, pet).
  const acceptedAt = sql<Date | null>`(
    SELECT max(${applications.updatedAt})
    FROM ${applications}
    WHERE ${applications.userId} = ${testimonials.userId}
      AND ${applications.petId} = ${testimonials.petId}
      AND ${applications.status} = 'acceptee'
  )`;

  const baseQuery = db
    .select({
      id: testimonials.id,
      content: testimonials.content,
      photoUrl: testimonials.photoUrl,
      createdAt: testimonials.createdAt,
      acceptedAt,
      authorName: sql<string>`(select name from users where id = ${testimonials.userId})`,
      petId: pets.id,
      petName: pets.name,
      petSpecies: pets.species,
      petPhotoUrl: sql<string | null>`(
        select url from ${petPhotos}
        where ${petPhotos.petId} = ${pets.id} and ${petPhotos.isPrimary} = true
        limit 1
      )`,
      shelterId: shelters.id,
      shelterName: shelters.name,
      shelterSlug: shelters.slug,
    })
    .from(testimonials)
    .innerJoin(pets, eq(pets.id, testimonials.petId))
    .leftJoin(shelters, eq(shelters.id, pets.shelterId))
    .where(and(...conditions));

  const [rows, totalRows] = await Promise.all([
    baseQuery
      .orderBy(desc(testimonials.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(testimonials)
      .innerJoin(pets, eq(pets.id, testimonials.petId))
      .leftJoin(shelters, eq(shelters.id, pets.shelterId))
      .where(and(...conditions)),
  ]);

  let mapped: PublicTestimonial[] = rows.map((r) => {
    const firstName = (r.authorName ?? "").split(/\s+/)[0] ?? "Anonyme";
    let daysSinceAdoption: number | null = null;
    let isVerified = false;
    if (r.acceptedAt) {
      const adopted = new Date(r.acceptedAt);
      const created = new Date(r.createdAt);
      const diff = Math.floor(
        (created.getTime() - adopted.getTime()) / (1000 * 60 * 60 * 24)
      );
      daysSinceAdoption = Math.max(0, diff);
      isVerified = diff >= VERIFIED_THRESHOLD_DAYS;
    }
    return {
      id: r.id,
      content: r.content,
      photoUrl: r.photoUrl,
      createdAt: r.createdAt,
      authorFirstName: firstName,
      isVerified,
      daysSinceAdoption,
      pet: {
        id: r.petId,
        name: r.petName,
        species: r.petSpecies as "chat" | "chien",
        photoUrl: r.petPhotoUrl,
      },
      shelter: r.shelterId
        ? {
            id: r.shelterId,
            name: r.shelterName!,
            slug: r.shelterSlug!,
          }
        : null,
    };
  });

  if (filters.verifiedOnly) {
    mapped = mapped.filter((t) => t.isVerified);
  }

  return {
    testimonials: mapped,
    total: Number(totalRows[0]?.count ?? 0),
  };
}

/**
 * Liste des refuges qui ont au moins un témoignage publié — sert à
 * peupler le filtre « refuge » du dashboard témoignages.
 */
export async function getSheltersWithTestimonials(): Promise<
  Array<{ id: string; name: string; slug: string; count: number }>
> {
  const rows = await db
    .select({
      id: shelters.id,
      name: shelters.name,
      slug: shelters.slug,
      count: sql<number>`count(${testimonials.id})::int`,
    })
    .from(shelters)
    .innerJoin(pets, eq(pets.shelterId, shelters.id))
    .innerJoin(testimonials, eq(testimonials.petId, pets.id))
    .where(eq(testimonials.isPublished, true))
    .groupBy(shelters.id, shelters.name, shelters.slug)
    .orderBy(desc(sql`count(${testimonials.id})`));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    count: Number(r.count),
  }));
}
