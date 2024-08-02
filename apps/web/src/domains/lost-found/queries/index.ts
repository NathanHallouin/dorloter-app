import { unstable_cache } from "next/cache";
import { db } from "@infra/db";
import { reports, reportPhotos, reportMatches } from "@/server/db/schema";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

interface ReportFilters {
  type?: "perdu" | "trouve";
  status?: "actif" | "resolu" | "expire";
  centerLat?: number;
  centerLng?: number;
  radiusKm?: number;
  /**
   * Si défini, ne retourne que les signalements créés depuis N jours.
   * 1 → 24h, 7 → semaine, 30 → mois. Hors plage = pas de filtre.
   */
  sinceDays?: number;
}

export async function getReports(
  filters: ReportFilters = {},
  limit = 50,
  offset = 0
) {
  const conditions = [];

  if (filters.type) conditions.push(eq(reports.type, filters.type));
  if (filters.status) conditions.push(eq(reports.status, filters.status));
  else conditions.push(eq(reports.status, "actif"));

  if (
    filters.centerLat !== undefined &&
    filters.centerLng !== undefined &&
    filters.radiusKm !== undefined
  ) {
    const meters = filters.radiusKm * 1000;
    conditions.push(
      sql`ST_DWithin(${reports.location}::geography, ST_SetSRID(ST_MakePoint(${filters.centerLng}, ${filters.centerLat}), 4326)::geography, ${meters})`
    );
  }

  if (filters.sinceDays && filters.sinceDays > 0) {
    conditions.push(
      sql`${reports.createdAt} > now() - interval '${sql.raw(String(filters.sinceDays))} days'`
    );
  }

  const rows = await db
    .select()
    .from(reports)
    .where(and(...conditions))
    .orderBy(desc(reports.dateEvent))
    .limit(limit)
    .offset(offset);

  return rows;
}

export async function getReportById(id: string) {
  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, id))
    .limit(1);
  return report ?? null;
}

/**
 * Récupère un signalement avec ses photos. Mis en cache 5 minutes (les
 * signalements actifs bougent peu — le matching et les photos évoluent
 * surtout dans les premières heures).
 */
export const getReportWithPhotos = unstable_cache(
  async (id: string) => {
    const report = await getReportById(id);
    if (!report) return null;

    const photos = await db
      .select()
      .from(reportPhotos)
      .where(eq(reportPhotos.reportId, id))
      .orderBy(asc(reportPhotos.order));

    return { ...report, photos };
  },
  ["report-with-photos"],
  { revalidate: 300, tags: ["reports"] }
);

export async function getReportsByUser(userId: string) {
  return db
    .select()
    .from(reports)
    .where(eq(reports.userId, userId))
    .orderBy(desc(reports.createdAt));
}

export interface GlobalReportStats {
  active: number;
  perdus: number;
  trouves: number;
  resolvedTotal: number;
  resolvedThisMonth: number;
}

/**
 * Compteurs publics pour la home : active = signalements toujours en cours,
 * resolved = retrouvailles confirmées via report_matches (status `confirme`).
 */
export async function getGlobalReportStats(): Promise<GlobalReportStats> {
  const [reportCounts] = await db
    .select({
      active: sql<number>`count(*) FILTER (WHERE ${reports.status} = 'actif')`,
      perdus: sql<number>`count(*) FILTER (WHERE ${reports.status} = 'actif' AND ${reports.type} = 'perdu')`,
      trouves: sql<number>`count(*) FILTER (WHERE ${reports.status} = 'actif' AND ${reports.type} = 'trouve')`,
    })
    .from(reports);

  const [matchCounts] = await db
    .select({
      total: sql<number>`count(*) FILTER (WHERE ${reportMatches.status} = 'confirme')`,
      thisMonth: sql<number>`count(*) FILTER (WHERE ${reportMatches.status} = 'confirme' AND ${reportMatches.createdAt} >= date_trunc('month', now()))`,
    })
    .from(reportMatches);

  return {
    active: Number(reportCounts?.active ?? 0),
    perdus: Number(reportCounts?.perdus ?? 0),
    trouves: Number(reportCounts?.trouves ?? 0),
    resolvedTotal: Number(matchCounts?.total ?? 0),
    resolvedThisMonth: Number(matchCounts?.thisMonth ?? 0),
  };
}

export interface RetrouvaillesStats {
  total: number;
  thisMonth: number;
  thisYear: number;
  monthlyHistogram: Array<{ monthKey: string; count: number }>;
  recent: Array<{
    matchId: string;
    confirmedAt: Date;
    distanceKm: number | null;
    score: number;
    perdu: {
      reportId: string;
      petName: string | null;
      species: "chat" | "chien";
      photoUrl: string | null;
    };
    trouve: {
      reportId: string;
      photoUrl: string | null;
    };
  }>;
}

/**
 * Stats publiques pour le dashboard /perdus-trouves/retrouvailles.
 *
 * - Total / mois courant / année courante : compteurs basés sur les
 *   correspondances confirmées (status='confirme').
 * - Histogramme : 12 derniers mois, count par mois.
 * - Recent : 12 dernières retrouvailles avec photos pour un mur de
 *   souvenirs anonymisé.
 */
export async function getRetrouvaillesStats(): Promise<RetrouvaillesStats> {
  const [counts] = await db
    .select({
      total: sql<number>`count(*)`,
      thisMonth: sql<number>`count(*) FILTER (WHERE ${reportMatches.createdAt} >= date_trunc('month', now()))`,
      thisYear: sql<number>`count(*) FILTER (WHERE ${reportMatches.createdAt} >= date_trunc('year', now()))`,
    })
    .from(reportMatches)
    .where(eq(reportMatches.status, "confirme"));

  const histogramRows = await db
    .select({
      monthKey: sql<string>`to_char(date_trunc('month', ${reportMatches.createdAt}), 'YYYY-MM')`,
      count: sql<number>`count(*)`,
    })
    .from(reportMatches)
    .where(
      and(
        eq(reportMatches.status, "confirme"),
        sql`${reportMatches.createdAt} >= date_trunc('month', now() - interval '11 months')`
      )
    )
    .groupBy(sql`date_trunc('month', ${reportMatches.createdAt})`)
    .orderBy(sql`date_trunc('month', ${reportMatches.createdAt}) ASC`);

  const recentRows = await db
    .select({
      matchId: reportMatches.id,
      score: reportMatches.score,
      distanceMeters: reportMatches.distanceMeters,
      confirmedAt: reportMatches.createdAt,
      lostReportId: reportMatches.lostReportId,
      foundReportId: reportMatches.foundReportId,
    })
    .from(reportMatches)
    .where(eq(reportMatches.status, "confirme"))
    .orderBy(desc(reportMatches.createdAt))
    .limit(12);

  const involvedIds = recentRows.flatMap((r) => [r.lostReportId, r.foundReportId]);
  const reportRows =
    involvedIds.length > 0
      ? await db
          .select({
            id: reports.id,
            petName: reports.petName,
            species: reports.species,
          })
          .from(reports)
          .where(inArray(reports.id, involvedIds))
      : [];
  const reportMap = new Map(reportRows.map((r) => [r.id, r]));

  const photoRows =
    involvedIds.length > 0
      ? await db
          .select()
          .from(reportPhotos)
          .where(
            and(
              inArray(reportPhotos.reportId, involvedIds),
              eq(reportPhotos.isPrimary, true)
            )
          )
      : [];
  const photoMap = new Map(photoRows.map((p) => [p.reportId, p.url]));

  const recent = recentRows
    .map((r) => {
      const lost = reportMap.get(r.lostReportId);
      if (!lost) return null;
      return {
        matchId: r.matchId,
        confirmedAt: r.confirmedAt,
        score: Number(r.score),
        distanceKm:
          r.distanceMeters !== null
            ? Number((r.distanceMeters / 1000).toFixed(1))
            : null,
        perdu: {
          reportId: r.lostReportId,
          petName: lost.petName,
          species: lost.species,
          photoUrl: photoMap.get(r.lostReportId) ?? null,
        },
        trouve: {
          reportId: r.foundReportId,
          photoUrl: photoMap.get(r.foundReportId) ?? null,
        },
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return {
    total: Number(counts?.total ?? 0),
    thisMonth: Number(counts?.thisMonth ?? 0),
    thisYear: Number(counts?.thisYear ?? 0),
    monthlyHistogram: histogramRows.map((r) => ({
      monthKey: r.monthKey,
      count: Number(r.count),
    })),
    recent,
  };
}

/**
 * Pour une liste de reports, renvoie un map reportId → photo principale.
 * Une seule requête peu importe le nombre de reports.
 */
export async function getPrimaryPhotosForReports(reportIds: string[]) {
  if (reportIds.length === 0) return new Map<string, typeof reportPhotos.$inferSelect>();

  const rows = await db
    .select()
    .from(reportPhotos)
    .where(
      and(inArray(reportPhotos.reportId, reportIds), eq(reportPhotos.isPrimary, true))
    );

  return new Map(rows.map((r) => [r.reportId, r]));
}
