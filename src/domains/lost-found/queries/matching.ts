import { db } from "@infra/db";
import { reports, reportMatches, reportPhotos } from "@/server/db/schema";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import type { Report } from "@/types";
import {
  computeMatchScore,
  MAX_DISTANCE_METERS,
  MIN_SCORE,
} from "../lib/match-score";

export type {
  MatchBreakdown,
} from "../lib/match-score";
export {
  SCORE_MAX,
  computeMatchScore,
  computeMatchBreakdown,
  getScoreTier,
} from "../lib/match-score";

export interface MatchCandidate {
  report: Report;
  distanceMeters: number;
  score: number;
}

// ─── Recherche de candidats ────────────────────────────────────────────────

/**
 * Retourne les signalements du type opposé, actifs, dans un rayon de 30 km,
 * avec leur distance et leur score.
 */
export async function findMatchCandidates(
  report: Report
): Promise<MatchCandidate[]> {
  const oppositeType = report.type === "perdu" ? "trouve" : "perdu";
  const lng = report.location?.x;
  const lat = report.location?.y;
  if (lng === undefined || lat === undefined) return [];

  const refPoint = sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;

  const rows = await db
    .select({
      report: reports,
      distanceMeters: sql<number>`ST_Distance(${reports.location}::geography, ${refPoint})`.as(
        "distance_meters"
      ),
    })
    .from(reports)
    .where(
      and(
        eq(reports.type, oppositeType),
        eq(reports.status, "actif"),
        ne(reports.id, report.id),
        sql`ST_DWithin(${reports.location}::geography, ${refPoint}, ${MAX_DISTANCE_METERS})`
      )
    );

  const candidates = rows.map((r) => {
    const distanceMeters = Number(r.distanceMeters);
    // Le "perdu" est toujours le premier arg du scoring
    const [lost, found] =
      report.type === "perdu" ? [report, r.report] : [r.report, report];
    const score = computeMatchScore(lost, found, distanceMeters);
    return { report: r.report, distanceMeters, score };
  });

  return candidates
    .filter((c) => c.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score);
}

/**
 * Recalcule et persiste les matches pour un signalement donné.
 * Supprime les anciens matches (statut "suggere" uniquement, pour préserver
 * les décisions humaines "confirme"/"rejete") et insère les nouveaux.
 *
 * Retourne la liste des candidats (pour permettre l'émission de notifications
 * aux propriétaires des signalements en face).
 */
export async function refreshMatchesForReport(
  report: Report
): Promise<MatchCandidate[]> {
  const candidates = await findMatchCandidates(report);

  const lostReportId = report.type === "perdu" ? report.id : null;
  const foundReportId = report.type === "trouve" ? report.id : null;

  // Supprimer les anciennes suggestions non décidées pour ce report
  if (lostReportId) {
    await db
      .delete(reportMatches)
      .where(
        and(
          eq(reportMatches.lostReportId, lostReportId),
          eq(reportMatches.status, "suggere")
        )
      );
  } else if (foundReportId) {
    await db
      .delete(reportMatches)
      .where(
        and(
          eq(reportMatches.foundReportId, foundReportId),
          eq(reportMatches.status, "suggere")
        )
      );
  }

  if (candidates.length === 0) return [];

  await db.insert(reportMatches).values(
    candidates.map((c) => ({
      lostReportId: report.type === "perdu" ? report.id : c.report.id,
      foundReportId: report.type === "trouve" ? report.id : c.report.id,
      score: c.score.toFixed(2),
      distanceMeters: Math.round(c.distanceMeters),
    }))
  );

  return candidates;
}

/**
 * Liste les matches d'un signalement avec le signalement en face et sa photo principale.
 */
export async function getMatchesForReport(reportId: string) {
  const rows = await db
    .select()
    .from(reportMatches)
    .where(
      sql`${reportMatches.lostReportId} = ${reportId} OR ${reportMatches.foundReportId} = ${reportId}`
    )
    .orderBy(sql`${reportMatches.score} DESC`);

  if (rows.length === 0) return [];

  const otherIds = rows.map((m) =>
    m.lostReportId === reportId ? m.foundReportId : m.lostReportId
  );

  const otherReports = await db
    .select()
    .from(reports)
    .where(inArray(reports.id, otherIds));

  const reportMap = new Map(otherReports.map((r) => [r.id, r]));

  const photoRows = await db
    .select()
    .from(reportPhotos)
    .where(
      and(inArray(reportPhotos.reportId, otherIds), eq(reportPhotos.isPrimary, true))
    );
  const photoMap = new Map(photoRows.map((p) => [p.reportId, p]));

  return rows
    .map((match) => {
      const otherId =
        match.lostReportId === reportId ? match.foundReportId : match.lostReportId;
      const other = reportMap.get(otherId);
      if (!other) return null;
      return {
        match,
        other,
        primaryPhoto: photoMap.get(otherId) ?? null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

export async function updateMatchStatus(
  matchId: string,
  status: "confirme" | "rejete"
) {
  await db
    .update(reportMatches)
    .set({ status })
    .where(eq(reportMatches.id, matchId));
}
