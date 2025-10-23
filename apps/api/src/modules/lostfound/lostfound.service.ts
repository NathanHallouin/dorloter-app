/**
 * Logique métier des signalements perdus/trouvés (hors scoring, délégué à
 * `MatchingService`). Les requêtes de proximité sont en SQL PostGIS natif : les
 * distances sont géodésiques (`::geography`, en mètres).
 */

import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';

import { DB, type Db } from '../../infra/database/database.module';
import { AppError } from '../../shared/app-error';
import { decodeCursor, encodeCursor } from '../../shared/cursor';
import {
  reportColumns,
  reportMatchColumns,
  reportPhotoColumns,
  type ReportMatchRecord,
  type ReportPhotoRecord,
  type ReportRecord,
} from './lostfound.domain';
import { MatchingService } from './matching.service';

export const REPORT_DEFAULT_LIMIT = 20;
export const REPORT_MAX_LIMIT = 100;

export interface PhotoInput {
  url: string;
  blurDataUrl: string | null;
  isPrimary: boolean;
}

export interface CreateReportCommand {
  type: string;
  species: string;
  petName: string | null;
  description: string;
  breed: string | null;
  color: string | null;
  sex: string;
  isChipped: boolean;
  chipNumber: string | null;
  distinctiveSigns: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  dateEvent: string;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
  photos: PhotoInput[];
}

export interface ReportListQuery {
  type: string | null;
  status: string | null;
  species: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusKm: number | null;
  sinceDays: number | null;
}

export interface ReportDetail {
  report: ReportRecord;
  photos: ReportPhotoRecord[];
}

export interface ReportListItem {
  report: ReportRecord;
  primaryPhoto: ReportPhotoRecord | null;
}

export interface ReportListPage {
  items: ReportListItem[];
  nextCursor: string | null;
}

export interface MatchView {
  match: ReportMatchRecord;
  other: ReportRecord;
  primaryPhoto: ReportPhotoRecord | null;
}

interface ReportCursor {
  date: string;
  id: string;
}

@Injectable()
export class LostFoundService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly matching: MatchingService,
  ) {}

  // --- Création (avec matching auto) ------------------------------------------------

  async create(userId: string, cmd: CreateReportCommand): Promise<ReportDetail> {
    const report = await this.db
      .insertInto('reports')
      .values({
        user_id: userId,
        type: cmd.type,
        status: 'actif',
        species: cmd.species,
        pet_name: cmd.petName,
        description: cmd.description,
        breed: cmd.breed,
        color: cmd.color,
        sex: cmd.sex,
        is_chipped: cmd.isChipped,
        chip_number: cmd.chipNumber,
        distinctive_signs: cmd.distinctiveSigns,
        location: sql`ST_SetSRID(ST_MakePoint(${cmd.longitude}, ${cmd.latitude}), 4326)`,
        address: cmd.address,
        date_event: cmd.dateEvent,
        contact_phone: cmd.contactPhone,
        contact_email: cmd.contactEmail,
        notes: cmd.notes,
      })
      .returning(reportColumns())
      .executeTakeFirstOrThrow();

    if (cmd.photos.length > 0) {
      await this.db
        .insertInto('report_photos')
        .values(
          cmd.photos.map((photo) => ({
            report_id: report.id,
            url: photo.url,
            blur_data_url: photo.blurDataUrl,
            is_primary: photo.isPrimary,
          })),
        )
        .execute();
    }

    // Recalcul des correspondances géo à la création (cœur métier du projet).
    await this.matching.refreshMatchesFor(report);

    return this.getDetail(report.id);
  }

  // --- Liste (proximité + curseur) ---------------------------------------------------

  async list(
    query: ReportListQuery,
    cursorParam: string | null,
    limit: number,
  ): Promise<ReportListPage> {
    let builder = this.db
      .selectFrom('reports')
      .select(reportColumns())
      .where('status', '=', query.status ?? 'actif');

    if (query.type !== null) builder = builder.where('type', '=', query.type);
    if (query.species !== null) builder = builder.where('species', '=', query.species);
    if (query.sinceDays !== null) {
      builder = builder.where('date_event', '>=', daysAgo(query.sinceDays));
    }
    if (query.latitude !== null && query.longitude !== null && query.radiusKm !== null) {
      const point = sql`ST_SetSRID(ST_MakePoint(${query.longitude}, ${query.latitude}), 4326)::geography`;
      builder = builder.where(
        sql<boolean>`ST_DWithin(location::geography, ${point}, ${query.radiusKm * 1000})`,
      );
    }

    const cursor = decodeCursor<ReportCursor>(cursorParam);
    if (cursor !== null) {
      builder = builder.where((eb) =>
        eb.or([
          eb('date_event', '<', cursor.date),
          eb.and([eb('date_event', '=', cursor.date), eb('id', '<', cursor.id)]),
        ]),
      );
    }

    const rows = await builder
      .orderBy('date_event', 'desc')
      .orderBy('id', 'desc')
      .limit(limit + 1)
      .execute();

    const hasMore = rows.length > limit;
    const reports = hasMore ? rows.slice(0, limit) : rows;
    const last = hasMore ? reports[reports.length - 1] : undefined;
    const nextCursor = last
      ? encodeCursor<ReportCursor>({ date: last.date_event, id: last.id })
      : null;

    const primary = await this.primaryPhotosOf(reports.map((report) => report.id));
    return {
      items: reports.map((report) => ({
        report,
        primaryPhoto: primary.get(report.id) ?? null,
      })),
      nextCursor,
    };
  }

  async getDetail(id: string): Promise<ReportDetail> {
    const report = await this.db
      .selectFrom('reports')
      .select(reportColumns())
      .where('id', '=', id)
      .executeTakeFirst();
    if (!report) throw AppError.notFoundId('Signalement', id);

    const photos = await this.db
      .selectFrom('report_photos')
      .select(reportPhotoColumns())
      .where('report_id', '=', id)
      .orderBy('is_primary', 'desc')
      .orderBy('order', 'asc')
      .execute();

    return { report, photos };
  }

  async revealContact(id: string): Promise<{ phone: string | null; email: string | null }> {
    const row = await this.db
      .selectFrom('reports')
      .select(['contact_phone', 'contact_email'])
      .where('id', '=', id)
      .executeTakeFirst();
    if (!row) throw AppError.notFoundId('Signalement', id);
    return { phone: row.contact_phone, email: row.contact_email };
  }

  async resolve(userId: string, id: string): Promise<void> {
    const report = await this.db
      .selectFrom('reports')
      .select('user_id')
      .where('id', '=', id)
      .executeTakeFirst();
    if (!report) throw AppError.notFoundId('Signalement', id);
    if (report.user_id !== userId) {
      throw AppError.forbidden("Seul l'auteur peut marquer ce signalement comme résolu.");
    }
    await this.db
      .updateTable('reports')
      .set({
        status: 'resolu',
        resolved_at: new Date(),
        resolved_by_user_id: userId,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .execute();
  }

  async getMatches(reportId: string): Promise<MatchView[]> {
    const exists = await this.db
      .selectFrom('reports')
      .select('id')
      .where('id', '=', reportId)
      .executeTakeFirst();
    if (!exists) throw AppError.notFoundId('Signalement', reportId);

    const matches = await this.db
      .selectFrom('report_matches')
      .select(reportMatchColumns())
      .where((eb) =>
        eb.or([eb('lost_report_id', '=', reportId), eb('found_report_id', '=', reportId)]),
      )
      .orderBy('score', 'desc')
      .execute();
    if (matches.length === 0) return [];

    const otherIds = matches.map((match) =>
      match.lost_report_id === reportId ? match.found_report_id : match.lost_report_id,
    );
    const others = await this.db
      .selectFrom('reports')
      .select(reportColumns())
      .where('id', 'in', otherIds)
      .execute();
    const byId = new Map(others.map((report) => [report.id, report]));
    const primary = await this.primaryPhotosOf(otherIds);

    const views: MatchView[] = [];
    for (const match of matches) {
      const otherId =
        match.lost_report_id === reportId ? match.found_report_id : match.lost_report_id;
      const other = byId.get(otherId);
      if (!other) continue;
      views.push({ match, other, primaryPhoto: primary.get(otherId) ?? null });
    }
    return views;
  }

  private async primaryPhotosOf(reportIds: string[]): Promise<Map<string, ReportPhotoRecord>> {
    const map = new Map<string, ReportPhotoRecord>();
    if (reportIds.length === 0) return map;
    const photos = await this.db
      .selectFrom('report_photos')
      .select(reportPhotoColumns())
      .where('report_id', 'in', reportIds)
      .where('is_primary', '=', true)
      .execute();
    for (const photo of photos) {
      if (!map.has(photo.report_id)) map.set(photo.report_id, photo);
    }
    return map;
  }
}

/** Date civile `yyyy-mm-dd` correspondant à « il y a n jours ». */
function daysAgo(days: number): string {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days));
  return date.toISOString().slice(0, 10);
}
