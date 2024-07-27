import { db } from "@infra/db";
import {
  applications,
  favorites,
  reports,
  shelterFollows,
  testimonials,
  users,
} from "@/server/db/schema";
import { and, eq, sql } from "drizzle-orm";
import {
  MILESTONE_BADGES,
  type MilestoneBadge,
  type MilestoneConfig,
} from "./badges";

export interface UserEngagementStats {
  /** Animaux mis en favoris. */
  favorites: number;
  /** Toutes candidatures confondues (en cours, acceptées, refusées). */
  applicationsTotal: number;
  /** Candidatures encore actives (envoyée / en cours). */
  applicationsActive: number;
  /** Candidatures acceptées (= adoptions concrétisées). */
  applicationsAccepted: number;
  /** Tous signalements (actif / résolu / expiré). */
  reportsTotal: number;
  /** Signalements actifs aujourd'hui. */
  reportsActive: number;
  /** Signalements résolus. */
  reportsResolved: number;
  /** Refuges suivis. */
  sheltersFollowed: number;
  /** Témoignages publiés par l'user. */
  testimonialsPublished: number;
  /** Compteur de retrouvailles confirmées (alimente les paliers de badges). */
  resolvedCount: number;
}

/**
 * Stats agrégées d'engagement d'un user — alimente la page profil
 * (compteurs + badges). Une seule query côté DB grâce aux sous-selects
 * conditionnels, plutôt que N round-trips.
 */
export async function getUserEngagementStats(
  userId: string
): Promise<UserEngagementStats> {
  const [stats] = await db
    .select({
      favorites: sql<number>`(
        SELECT count(*) FROM ${favorites}
        WHERE ${favorites.userId} = ${userId}
      )`,
      applicationsTotal: sql<number>`(
        SELECT count(*) FROM ${applications}
        WHERE ${applications.userId} = ${userId}
      )`,
      applicationsActive: sql<number>`(
        SELECT count(*) FROM ${applications}
        WHERE ${applications.userId} = ${userId}
          AND ${applications.status} IN ('envoyee', 'en_cours')
      )`,
      applicationsAccepted: sql<number>`(
        SELECT count(*) FROM ${applications}
        WHERE ${applications.userId} = ${userId}
          AND ${applications.status} = 'acceptee'
      )`,
      reportsTotal: sql<number>`(
        SELECT count(*) FROM ${reports}
        WHERE ${reports.userId} = ${userId}
      )`,
      reportsActive: sql<number>`(
        SELECT count(*) FROM ${reports}
        WHERE ${reports.userId} = ${userId}
          AND ${reports.status} = 'actif'
      )`,
      reportsResolved: sql<number>`(
        SELECT count(*) FROM ${reports}
        WHERE ${reports.userId} = ${userId}
          AND ${reports.status} = 'resolu'
      )`,
      sheltersFollowed: sql<number>`(
        SELECT count(*) FROM ${shelterFollows}
        WHERE ${shelterFollows.userId} = ${userId}
      )`,
      testimonialsPublished: sql<number>`(
        SELECT count(*) FROM ${testimonials}
        WHERE ${testimonials.userId} = ${userId}
          AND ${testimonials.isPublished} = true
      )`,
      resolvedCount: users.resolvedCount,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return {
    favorites: Number(stats?.favorites ?? 0),
    applicationsTotal: Number(stats?.applicationsTotal ?? 0),
    applicationsActive: Number(stats?.applicationsActive ?? 0),
    applicationsAccepted: Number(stats?.applicationsAccepted ?? 0),
    reportsTotal: Number(stats?.reportsTotal ?? 0),
    reportsActive: Number(stats?.reportsActive ?? 0),
    reportsResolved: Number(stats?.reportsResolved ?? 0),
    sheltersFollowed: Number(stats?.sheltersFollowed ?? 0),
    testimonialsPublished: Number(stats?.testimonialsPublished ?? 0),
    resolvedCount: Number(stats?.resolvedCount ?? 0),
  };
}

/**
 * Liste des badges débloqués par un user, dérivée de ses stats.
 *
 * - Tiers de retrouvailles : Bonne âme (1) → Héros (3) → Sentinelle (10)
 *   → on attribue tous les paliers atteints, pas seulement le plus haut
 *   (le profil affiche la collection)
 * - Éclaireur : 5 signalements déposés (actif/résolu/expiré confondus)
 * - Famille : 1 candidature acceptée → l'utilisateur a effectivement adopté
 */
export function deriveUserBadges(
  stats: UserEngagementStats
): MilestoneConfig[] {
  const out: MilestoneConfig[] = [];

  if (stats.resolvedCount >= 1) out.push(MILESTONE_BADGES["bonne-ame"]);
  if (stats.resolvedCount >= 3) out.push(MILESTONE_BADGES.heros);
  if (stats.resolvedCount >= 10) out.push(MILESTONE_BADGES.sentinelle);
  if (stats.reportsTotal >= 5) out.push(MILESTONE_BADGES.eclaireur);
  if (stats.applicationsAccepted >= 1) out.push(MILESTONE_BADGES.famille);

  return out;
}

export async function getUserBadges(userId: string): Promise<MilestoneConfig[]> {
  const stats = await getUserEngagementStats(userId);
  return deriveUserBadges(stats);
}
