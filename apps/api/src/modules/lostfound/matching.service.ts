/**
 * Calcul et persistance des correspondances perdu/trouvé.
 *
 * À chaque (re)calcul pour un signalement : recherche des signalements du type
 * opposé dans un rayon de 30 km (PostGIS), scoring de chaque candidat, on garde
 * ceux >= 40, puis remplacement des suggestions précédentes. Les décisions
 * humaines (confirmé / rejeté) sont préservées.
 */

import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';

import { DB, type Db } from '../../infra/database/database.module';
import { oppositeType, reportColumns, type ReportRecord } from './lostfound.domain';
import { MAX_DISTANCE_METERS, MIN_SCORE, totalScore } from './match-score';

@Injectable()
export class MatchingService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Recalcule les correspondances pour un signalement. Renvoie le nombre créé. */
  async refreshMatchesFor(report: ReportRecord): Promise<number> {
    const isLost = report.type === 'perdu';
    const opposite = oppositeType(report.type);

    const candidates = await this.candidateDistances(
      opposite,
      report.lng,
      report.lat,
      MAX_DISTANCE_METERS,
      report.id,
    );

    // Suppression des anciennes suggestions de CE signalement (confirmé/rejeté conservés).
    await this.db
      .deleteFrom('report_matches')
      .where(isLost ? 'lost_report_id' : 'found_report_id', '=', report.id)
      .where('status', '=', 'suggere')
      .execute();

    if (candidates.length === 0) return 0;

    const candidateReports = await this.db
      .selectFrom('reports')
      .select(reportColumns())
      .where(
        'id',
        'in',
        candidates.map((candidate) => candidate.id),
      )
      .execute();
    const byId = new Map(candidateReports.map((row) => [row.id, row]));
    const alreadyDecided = await this.decidedCounterparts(report.id);

    let created = 0;
    for (const candidate of candidates) {
      const other = byId.get(candidate.id);
      if (!other || alreadyDecided.has(other.id)) continue;

      const lost = isLost ? report : other;
      const found = isLost ? other : report;
      const score = totalScore(lost, found, candidate.distance);
      if (score < MIN_SCORE) continue;

      const result = await this.db
        .insertInto('report_matches')
        .values({
          lost_report_id: lost.id,
          found_report_id: found.id,
          score,
          distance_meters: Math.round(candidate.distance),
          status: 'suggere',
        })
        .onConflict((oc) => oc.columns(['lost_report_id', 'found_report_id']).doNothing())
        .executeTakeFirst();
      created += Number(result.numInsertedOrUpdatedRows ?? 0n);
    }
    return created;
  }

  /** Distances (m) des signalements du type opposé, actifs, dans le rayon donné. */
  private async candidateDistances(
    opposite: string,
    longitude: number,
    latitude: number,
    maxDistanceMeters: number,
    excludeReportId: string,
  ): Promise<{ id: string; distance: number }[]> {
    const point = sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography`;
    const rows = await this.db
      .selectFrom('reports as r')
      .select(['r.id', sql<number>`ST_Distance(r.location::geography, ${point})`.as('distance')])
      .where('r.type', '=', opposite)
      .where('r.status', '=', 'actif')
      .where('r.id', '<>', excludeReportId)
      .where(sql<boolean>`ST_DWithin(r.location::geography, ${point}, ${maxDistanceMeters})`)
      .execute();
    return rows;
  }

  /** Paires déjà décidées (confirmé / rejeté) : à ne pas re-suggérer. */
  private async decidedCounterparts(reportId: string): Promise<Set<string>> {
    const rows = await this.db
      .selectFrom('report_matches')
      .select(['lost_report_id', 'found_report_id'])
      .where((eb) =>
        eb.or([eb('lost_report_id', '=', reportId), eb('found_report_id', '=', reportId)]),
      )
      .where('status', '<>', 'suggere')
      .execute();
    return new Set(
      rows.map((row) =>
        row.lost_report_id === reportId ? row.found_report_id : row.lost_report_id,
      ),
    );
  }
}
