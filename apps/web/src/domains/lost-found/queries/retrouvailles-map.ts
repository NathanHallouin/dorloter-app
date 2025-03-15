import { aliasedTable, and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@infra/db";
import { reportMatches, reports } from "@/server/db/schema";

export interface RetrouvaillesMapPoint {
  matchId: string;
  lat: number;
  lng: number;
  confirmedAt: Date;
  species: "chat" | "chien";
  distanceMeters: number | null;
}

/**
 * Tous les points de retrouvailles confirmées, anonymisés : on prend la
 * position du signalement « trouvé » (lieu public où l'animal a été
 * récupéré), pas du « perdu » qui pourrait pointer vers le domicile du
 * propriétaire. Aucun nom, aucun ID de report exposé.
 */
export async function getRetrouvaillesMapPoints(): Promise<
  RetrouvaillesMapPoint[]
> {
  const foundReport = aliasedTable(reports, "found_report");

  const rows = await db
    .select({
      matchId: reportMatches.id,
      confirmedAt: reportMatches.createdAt,
      distanceMeters: reportMatches.distanceMeters,
      species: foundReport.species,
      location: foundReport.location,
    })
    .from(reportMatches)
    .innerJoin(foundReport, eq(reportMatches.foundReportId, foundReport.id))
    .where(
      and(
        eq(reportMatches.status, "confirme"),
        isNotNull(foundReport.location)
      )
    )
    .orderBy(desc(reportMatches.createdAt))
    .limit(2000);

  return rows
    .filter((r) => r.location !== null)
    .map((r) => ({
      matchId: r.matchId,
      lat: r.location!.y,
      lng: r.location!.x,
      confirmedAt: r.confirmedAt,
      species: r.species,
      distanceMeters: r.distanceMeters,
    }));
}
