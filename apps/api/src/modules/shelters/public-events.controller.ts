/**
 * Calendrier public des événements adoption. Agrège les événements publics à
 * venir de tous les refuges vérifiés, avec la localisation du refuge pour la
 * carte. Filtres : type, fenêtre de dates, zone (proximité géo). Endpoint public
 * (pas d'auth), tri chronologique, pagination keyset ascendante.
 */

import { Controller, Get, Inject, Query } from '@nestjs/common';
import { sql } from 'kysely';

import { DB, type Db } from '../../infra/database/database.module';
import { page, type PageResponse } from '../../shared/api-response';
import { decodeCursor, encodeCursor } from '../../shared/cursor';
import { EVENT_TYPE, validateFilter } from '../../shared/db-enum';
import { toIso, toIsoOrNull } from '../../shared/format';
import {
  clampLimit,
  queryDate,
  queryFloat,
  queryInt,
  queryString,
} from '../../shared/validation';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const DEFAULT_RADIUS_KM = 30;

interface CalendarCursor {
  startsAt: string;
  id: string;
}

interface CalendarEventDto {
  id: string;
  title: string;
  type: string;
  startsAt: string;
  endsAt: string | null;
  /** Lieu (adresse libre saisie par le refuge). */
  location: string | null;
  needs: string | null;
  capacity: number | null;
  shelter: {
    id: string;
    slug: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
  };
  /** Distance au point de recherche, en mètres (si `lat`/`lng` fournis). */
  distanceMeters: number | null;
}

@Controller('api/v1/events')
export class PublicEventsController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get()
  async list(@Query() query: Record<string, unknown>): Promise<PageResponse<CalendarEventDto>> {
    const type = validateFilter(queryString(query.type), EVENT_TYPE);
    const limit = clampLimit(queryInt(query.limit, 'limit'), DEFAULT_LIMIT, MAX_LIMIT);
    const cursor = decodeCursor<CalendarCursor>(queryString(query.cursor));
    const from = queryDate(query.from, 'from');
    const to = queryDate(query.to, 'to');
    const lat = queryFloat(query.lat, 'lat');
    const lng = queryFloat(query.lng, 'lng');
    // Zone : n'active le filtre géo que si le couple lat/lng est complet.
    const geo = lat !== null && lng !== null ? { lat, lng } : null;
    const radiusMeters = Math.max(queryFloat(query.radiusKm, 'radiusKm') ?? DEFAULT_RADIUS_KM, 0) * 1000;

    let builder = this.db
      .selectFrom('events as e')
      .innerJoin('shelters as s', 's.id', 'e.shelter_id')
      .select([
        'e.id',
        'e.title',
        'e.type',
        'e.starts_at',
        'e.ends_at',
        'e.location',
        'e.needs',
        'e.capacity',
        's.id as shelter_id',
        's.slug as shelter_slug',
        's.name as shelter_name',
        sql<number | null>`ST_Y(s.location)`.as('lat'),
        sql<number | null>`ST_X(s.location)`.as('lng'),
        // Distance au point de recherche (NULL si pas de recherche géo).
        geo
          ? sql<number | null>`ST_Distance(s.location, ST_SetSRID(ST_MakePoint(${geo.lng}, ${geo.lat}), 4326)::geography)`.as(
              'distance_meters',
            )
          : sql<number | null>`NULL::float8`.as('distance_meters'),
      ])
      .where('e.is_public', '=', true)
      .where('s.is_verified', '=', true);

    // Fenêtre temporelle : à venir (ou depuis `from`) jusqu'à `to`.
    builder =
      from === null
        ? builder.where(sql<boolean>`e.starts_at >= now() - interval '12 hours'`)
        : builder.where(sql<boolean>`e.starts_at >= ${from}`);
    if (to !== null) {
      // Inclut toute la journée `to`.
      builder = builder.where(sql<boolean>`e.starts_at < (${to}::date + interval '1 day')`);
    }
    if (type !== null) builder = builder.where('e.type', '=', type);
    if (geo !== null) {
      builder = builder
        .where('s.location', 'is not', null)
        .where(
          sql<boolean>`ST_DWithin(s.location, ST_SetSRID(ST_MakePoint(${geo.lng}, ${geo.lat}), 4326)::geography, ${radiusMeters})`,
        );
    }
    // Keyset ascendant : (starts_at, id) strictement après le curseur.
    if (cursor !== null) {
      builder = builder.where(
        sql<boolean>`(e.starts_at, e.id) > (${new Date(cursor.startsAt)}, ${cursor.id}::uuid)`,
      );
    }

    const rows = await builder
      .orderBy('e.starts_at', 'asc')
      .orderBy('e.id', 'asc')
      .limit(limit + 1)
      .execute();

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = hasMore ? items[items.length - 1] : undefined;
    const nextCursor = last
      ? encodeCursor<CalendarCursor>({ startsAt: last.starts_at.toISOString(), id: last.id })
      : null;

    return page(
      items.map((row) => ({
        id: row.id,
        title: row.title,
        type: row.type,
        startsAt: toIso(row.starts_at),
        endsAt: toIsoOrNull(row.ends_at),
        location: row.location,
        needs: row.needs,
        capacity: row.capacity,
        shelter: {
          id: row.shelter_id,
          slug: row.shelter_slug,
          name: row.shelter_name,
          latitude: row.lat,
          longitude: row.lng,
        },
        distanceMeters: row.distance_meters === null ? null : Math.round(row.distance_meters),
      })),
      nextCursor,
    );
  }
}
