import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@infra/db";
import { reportSightings, users } from "@/server/db/schema";

export interface SightingRow {
  id: string;
  reportId: string;
  userId: string;
  userName: string;
  location: { x: number; y: number };
  address: string | null;
  description: string;
  observedAt: Date;
  photoUrl: string | null;
  status: "actif" | "masque";
  createdAt: Date;
}

/**
 * Liste les sightings actifs d'un signalement, plus récents en premier.
 * Inclut le nom de l'auteur pour l'attribution.
 */
export async function getSightingsForReport(
  reportId: string,
  opts: { includeMasked?: boolean } = {}
): Promise<SightingRow[]> {
  const conditions = [eq(reportSightings.reportId, reportId)];
  if (!opts.includeMasked) {
    conditions.push(eq(reportSightings.status, "actif"));
  }
  const rows = await db
    .select({
      id: reportSightings.id,
      reportId: reportSightings.reportId,
      userId: reportSightings.userId,
      userName: users.name,
      location: reportSightings.location,
      address: reportSightings.address,
      description: reportSightings.description,
      observedAt: reportSightings.observedAt,
      photoUrl: reportSightings.photoUrl,
      status: reportSightings.status,
      createdAt: reportSightings.createdAt,
    })
    .from(reportSightings)
    .innerJoin(users, eq(users.id, reportSightings.userId))
    .where(and(...conditions))
    .orderBy(desc(reportSightings.observedAt));
  return rows.map((r) => ({
    ...r,
    location: r.location ?? { x: 0, y: 0 },
  }));
}

export async function countSightingsForReport(
  reportId: string
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(reportSightings)
    .where(
      and(
        eq(reportSightings.reportId, reportId),
        eq(reportSightings.status, "actif")
      )
    );
  return Number(row?.count ?? 0);
}
