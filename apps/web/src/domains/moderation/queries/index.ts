import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@infra/db";
import {
  pets,
  contentReports,
  reports,
  shelters,
  users,
  pensions,
  veterinarians,
} from "@/server/db/schema";

/**
 * Pour l'admin plateforme : file de modération regroupée par contenu signalé
 * (pour ne pas afficher 10 lignes pour le même chat). Les signalements
 * "en_attente" uniquement.
 */
export async function getPendingModerationQueue() {
  // Tous les signalements en attente, groupés par contenu
  const rows = await db
    .select({
      contentType: contentReports.contentType,
      contentId: contentReports.contentId,
      count: sql<number>`count(*)`,
      distinctReporters: sql<number>`count(distinct reporter_id)`,
      latestAt: sql<Date>`max(created_at)`,
    })
    .from(contentReports)
    .where(eq(contentReports.status, "en_attente"))
    .groupBy(contentReports.contentType, contentReports.contentId)
    .orderBy(sql`max(created_at) DESC`);

  if (rows.length === 0) return [];

  // Enrich avec les détails du contenu
  const petIds = rows.filter((r) => r.contentType === "pet").map((r) => r.contentId);
  const reportIds = rows
    .filter((r) => r.contentType === "report")
    .map((r) => r.contentId);
  const shelterIds = rows
    .filter((r) => r.contentType === "shelter")
    .map((r) => r.contentId);

  const [catRows, reportRows, shelterRows] = await Promise.all([
    petIds.length > 0
      ? db
          .select({ id: pets.id, name: pets.name })
          .from(pets)
          .where(inArray(pets.id, petIds))
      : [],
    reportIds.length > 0
      ? db
          .select({
            id: reports.id,
            type: reports.type,
            petName: reports.petName,
          })
          .from(reports)
          .where(inArray(reports.id, reportIds))
      : [],
    shelterIds.length > 0
      ? db
          .select({ id: shelters.id, name: shelters.name })
          .from(shelters)
          .where(inArray(shelters.id, shelterIds))
      : [],
  ]);

  const catMap = new Map(catRows.map((r) => [r.id, r.name]));
  const reportMap = new Map(
    reportRows.map((r) => [
      r.id,
      r.petName ??
        (r.type === "perdu" ? "Animal perdu" : "Animal trouvé"),
    ])
  );
  const shelterMap = new Map(shelterRows.map((r) => [r.id, r.name]));

  return rows.map((r) => ({
    ...r,
    label:
      r.contentType === "pet"
        ? catMap.get(r.contentId) ?? "Chat supprimé"
        : r.contentType === "report"
          ? reportMap.get(r.contentId) ?? "Signalement supprimé"
          : r.contentType === "shelter"
            ? shelterMap.get(r.contentId) ?? "Refuge supprimé"
            : "Utilisateur",
  }));
}

/**
 * Détail des signalements sur un contenu précis (pour la modale admin).
 */
export async function getReportsForContent(
  contentType: "pet" | "report" | "shelter" | "user",
  contentId: string
) {
  return db
    .select({
      report: contentReports,
      reporter: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(contentReports)
    .leftJoin(users, eq(users.id, contentReports.reporterId))
    .where(
      and(
        eq(contentReports.contentType, contentType),
        eq(contentReports.contentId, contentId),
        eq(contentReports.status, "en_attente")
      )
    )
    .orderBy(desc(contentReports.createdAt));
}

/**
 * Refuges non vérifiés (SIRET déclaré ou non), pour la page admin de
 * validation.
 */
export async function getUnverifiedShelters() {
  return db
    .select()
    .from(shelters)
    .where(eq(shelters.isVerified, false))
    .orderBy(desc(shelters.createdAt));
}

/**
 * Compteurs des items "à traiter" affichés en badges dans la sidebar admin
 * et la home admin. Une seule query par compteur, parallélisées.
 */
export async function getAdminPendingCounts(): Promise<{
  moderation: number;
  shelters: number;
  pensions: number;
  veterinarians: number;
}> {
  const [moderationRows, shelterRows, pensionRows, vetRows] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(distinct (content_type, content_id))` })
        .from(contentReports)
        .where(eq(contentReports.status, "en_attente")),
      db
        .select({ count: sql<number>`count(*)` })
        .from(shelters)
        .where(eq(shelters.isVerified, false)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(pensions)
        .where(eq(pensions.isVerified, false)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(veterinarians)
        .where(eq(veterinarians.isVerified, false)),
    ]);
  return {
    moderation: Number(moderationRows[0]?.count ?? 0),
    shelters: Number(shelterRows[0]?.count ?? 0),
    pensions: Number(pensionRows[0]?.count ?? 0),
    veterinarians: Number(vetRows[0]?.count ?? 0),
  };
}

export interface UserContentReport {
  id: string;
  contentType: "pet" | "report" | "shelter" | "user";
  contentId: string;
  reason: string;
  comment: string | null;
  status: "en_attente" | "masque" | "rejete";
  createdAt: Date;
  resolvedAt: Date | null;
  /** Libellé humain du contenu signalé (nom du chat / refuge, titre signalement…). */
  label: string;
  /** URL publique du contenu, si encore visible. Null si contenu masqué/supprimé. */
  publicHref: string | null;
}

/**
 * Liste des signalements de contenu déposés par un utilisateur, plus récents
 * en premier. Affichée dans `/parametres/signalements` — donne du pouvoir à
 * la communauté en montrant ce qui est devenu de chaque signalement.
 */
export async function getContentReportsByUser(
  userId: string
): Promise<UserContentReport[]> {
  const rows = await db
    .select()
    .from(contentReports)
    .where(eq(contentReports.reporterId, userId))
    .orderBy(desc(contentReports.createdAt));

  if (rows.length === 0) return [];

  const petIds = rows
    .filter((r) => r.contentType === "pet")
    .map((r) => r.contentId);
  const reportIds = rows
    .filter((r) => r.contentType === "report")
    .map((r) => r.contentId);
  const shelterIds = rows
    .filter((r) => r.contentType === "shelter")
    .map((r) => r.contentId);

  const [petRows, reportRows, shelterRows] = await Promise.all([
    petIds.length > 0
      ? db
          .select({
            id: pets.id,
            name: pets.name,
            status: pets.status,
          })
          .from(pets)
          .where(inArray(pets.id, petIds))
      : [],
    reportIds.length > 0
      ? db
          .select({
            id: reports.id,
            type: reports.type,
            petName: reports.petName,
            status: reports.status,
          })
          .from(reports)
          .where(inArray(reports.id, reportIds))
      : [],
    shelterIds.length > 0
      ? db
          .select({
            id: shelters.id,
            name: shelters.name,
            isVerified: shelters.isVerified,
          })
          .from(shelters)
          .where(inArray(shelters.id, shelterIds))
      : [],
  ]);

  const petMap = new Map(petRows.map((r) => [r.id, r]));
  const reportMap = new Map(reportRows.map((r) => [r.id, r]));
  const shelterMap = new Map(shelterRows.map((r) => [r.id, r]));

  return rows.map((r) => {
    let label = "Contenu";
    let publicHref: string | null = null;

    if (r.contentType === "pet") {
      const pet = petMap.get(r.contentId);
      label = pet?.name ?? "Animal supprimé";
      publicHref =
        pet && pet.status !== "retire" ? `/adopter/${r.contentId}` : null;
    } else if (r.contentType === "report") {
      const report = reportMap.get(r.contentId);
      if (!report) {
        label = "Signalement supprimé";
      } else {
        label =
          report.petName ??
          (report.type === "perdu" ? "Animal perdu" : "Animal trouvé");
      }
      publicHref =
        report && report.status === "actif"
          ? `/perdus-trouves/${r.contentId}`
          : null;
    } else if (r.contentType === "shelter") {
      const shelter = shelterMap.get(r.contentId);
      label = shelter?.name ?? "Refuge supprimé";
      publicHref = shelter?.isVerified ? `/refuges/${r.contentId}` : null;
    } else {
      label = "Utilisateur";
    }

    return {
      id: r.id,
      contentType: r.contentType,
      contentId: r.contentId,
      reason: r.reason,
      comment: r.comment,
      status: r.status,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt,
      label,
      publicHref,
    };
  });
}
