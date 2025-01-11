import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "@infra/db";
import { veterinarians, vetReportAccessLog } from "@/server/db/schema";

export interface VetListFilters {
  search?: string;
  acceptsCats?: boolean;
  acceptsDogs?: boolean;
  acceptsNac?: boolean;
  emergencyOnly?: boolean;
}

/**
 * Liste publique des cabinets vérifiés, pour l'annuaire `/veterinaires`.
 * Filtres optionnels (recherche par nom/ville, espèces, urgences).
 */
export async function getVerifiedVeterinarians(
  filters: VetListFilters = {}
) {
  const conditions = [eq(veterinarians.isVerified, true)];
  if (filters.search) {
    conditions.push(
      sql`(${ilike(veterinarians.name, `%${filters.search}%`)} OR ${ilike(veterinarians.address, `%${filters.search}%`)})`
    );
  }
  if (filters.acceptsCats) conditions.push(eq(veterinarians.acceptsCats, true));
  if (filters.acceptsDogs) conditions.push(eq(veterinarians.acceptsDogs, true));
  if (filters.acceptsNac) conditions.push(eq(veterinarians.acceptsNac, true));
  if (filters.emergencyOnly)
    conditions.push(eq(veterinarians.emergencyAvailable, true));
  return db
    .select()
    .from(veterinarians)
    .where(and(...conditions))
    .orderBy(asc(veterinarians.name));
}

export async function getVeterinarianById(id: string) {
  const [row] = await db
    .select()
    .from(veterinarians)
    .where(eq(veterinarians.id, id))
    .limit(1);
  return row ?? null;
}

export async function getVeterinarianBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(veterinarians)
    .where(eq(veterinarians.slug, slug))
    .limit(1);
  return row ?? null;
}

/**
 * File d'attente côté admin plateforme : cabinets en attente de
 * vérification (cross-check SIRET + ONV à faire manuellement).
 */
export async function getUnverifiedVeterinarians() {
  return db
    .select()
    .from(veterinarians)
    .where(eq(veterinarians.isVerified, false))
    .orderBy(desc(veterinarians.createdAt));
}

/**
 * Stats globales pour les compteurs admin et la home (annuaire).
 */
export async function getGlobalVetStats() {
  const [row] = await db
    .select({
      total: sql<number>`count(*)`,
      verified: sql<number>`count(*) FILTER (WHERE ${veterinarians.isVerified} = true)`,
      emergencies: sql<number>`count(*) FILTER (WHERE ${veterinarians.isVerified} = true AND ${veterinarians.emergencyAvailable} = true)`,
    })
    .from(veterinarians);
  return {
    total: Number(row?.total ?? 0),
    verified: Number(row?.verified ?? 0),
    emergencies: Number(row?.emergencies ?? 0),
  };
}

/**
 * Audit RGPD : historique des consultations de signalements par un véto.
 * Affiché dans le panel véto (transparence : on voit ce qu'on a consulté)
 * et lisible par les admins plateforme en cas de demande.
 */
export async function getRecentReportAccess(vetId: string, limit = 50) {
  return db
    .select()
    .from(vetReportAccessLog)
    .where(eq(vetReportAccessLog.vetId, vetId))
    .orderBy(desc(vetReportAccessLog.accessedAt))
    .limit(limit);
}
