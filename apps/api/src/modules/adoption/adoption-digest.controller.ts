/**
 * Digest « Nouveautés dans votre rayon ». Suggère jusqu'à 3 animaux à adopter
 * récemment publiés dans le rayon de l'utilisateur, priorisés par compatibilité
 * (espèce la plus mise en favori). Deux usages :
 * - `GET /api/v1/me/digest` : calcul à la volée pour l'utilisateur connecté ;
 * - `POST /api/v1/admin/digest/run` : publie le digest dans le centre in-app des
 *   utilisateurs opt-in (déclenchable par un cron externe ; pas de planificateur
 *   interne). Le push navigateur (Web Push) reste un gap infra.
 */

import { Controller, Get, Inject, Post } from '@nestjs/common';
import { sql } from 'kysely';

import { DB, type Db } from '../../infra/database/database.module';
import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { ok, type ApiResponse } from '../../shared/api-response';
import { toIso } from '../../shared/format';
import { NotificationsService } from '../notifications/notifications.service';

/** Fenêtre de fraîcheur d'un animal « nouveau » et taille du digest. */
const RECENT_DAYS = 30;
const DIGEST_SIZE = 3;

interface DigestRow {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  age_category: string | null;
  sex: string;
  created_at: Date;
  shelter_name: string;
  shelter_slug: string;
  photo_url: string | null;
  distance_m: number | null;
}

interface DigestItemDto {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  ageCategory: string | null;
  sex: string;
  photoUrl: string | null;
  shelterName: string;
  shelterSlug: string;
  distanceMeters: number | null;
  createdAt: string;
}

interface MyDigestDto {
  /** Faux si l'utilisateur n'a pas encore posé sa localisation. */
  hasLocation: boolean;
  radiusKm: number;
  items: DigestItemDto[];
}

@Controller('api/v1')
export class AdoptionDigestController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly notifications: NotificationsService,
  ) {}

  @Get('me/digest')
  @Auth()
  async myDigest(@CurrentUser() current: CurrentUserInfo): Promise<ApiResponse<MyDigestDto>> {
    const geo = await this.db
      .selectFrom('users')
      .select([
        sql<number | null>`ST_Y(location)`.as('lat'),
        sql<number | null>`ST_X(location)`.as('lng'),
        'notification_radius_km as radius_km',
      ])
      .where('id', '=', current.userId)
      .executeTakeFirstOrThrow();

    const hasLocation = geo.lat !== null && geo.lng !== null;
    const items = hasLocation
      ? (await this.compute(current.userId, geo.lat!, geo.lng!, geo.radius_km)).map(toItemDto)
      : [];

    return ok({ hasLocation, radiusKm: geo.radius_km, items });
  }

  /**
   * Publie le digest dans le centre de notifications in-app des utilisateurs
   * opt-in disposant d'une localisation. Réservé plateforme, déclenchable par un
   * cron externe (hebdomadaire). Une exécution = un envoi (non idempotent).
   */
  @Post('admin/digest/run')
  @Auth()
  async runDigest(@CurrentUser() current: CurrentUserInfo): Promise<
    ApiResponse<{ usersConsidered: number; usersNotified: number; petsSuggested: number }>
  > {
    current.requireRole('platform_admin');

    const recipients = await this.db
      .selectFrom('users')
      .select([
        'id',
        sql<number | null>`ST_Y(location)`.as('lat'),
        sql<number | null>`ST_X(location)`.as('lng'),
        'notification_radius_km as radius_km',
      ])
      .where('digest_optin', '=', true)
      .where('location', 'is not', null)
      .execute();

    let usersNotified = 0;
    let petsSuggested = 0;
    for (const user of recipients) {
      if (user.lat === null || user.lng === null) continue;
      const items = await this.compute(user.id, user.lat, user.lng, user.radius_km);
      if (items.length === 0) continue;
      const body = `Découvrez ${joinFr(items.map((item) => item.name))} près de chez vous.`;
      await this.notifications.publish(
        user.id,
        'new_cat_nearby',
        'Nouveautés dans votre rayon',
        body,
        { petIds: items.map((item) => item.id), link: '/adopter' },
      );
      usersNotified += 1;
      petsSuggested += items.length;
    }

    return ok({ usersConsidered: recipients.length, usersNotified, petsSuggested });
  }

  /**
   * Jusqu'à 3 animaux disponibles récents dans le rayon de l'utilisateur, hors
   * favoris et candidatures déjà faits, priorisés par espèce préférée (la plus
   * mise en favori).
   */
  private async compute(
    userId: string,
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<DigestRow[]> {
    const preferred = await this.db
      .selectFrom('favorites as f')
      .innerJoin('pets as p', 'p.id', 'f.pet_id')
      .select('p.species')
      .where('f.user_id', '=', userId)
      .groupBy('p.species')
      .orderBy(sql`count(*)`, 'desc')
      .limit(1)
      .executeTakeFirst();
    const preferredSpecies = preferred?.species ?? null;
    const radiusMeters = Math.max(radiusKm, 1) * 1000;

    const result = await sql<DigestRow>`
      SELECT p.id, p.name, p.species, p.breed, p.age_category, p.sex, p.created_at,
             s.name AS shelter_name, s.slug AS shelter_slug, ph.url AS photo_url,
             ST_Distance(s.location::geography,
                         ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) AS distance_m
      FROM pets p
      JOIN shelters s ON s.id = p.shelter_id
      LEFT JOIN LATERAL (
        SELECT url FROM pet_photos WHERE pet_id = p.id ORDER BY is_primary DESC, "order" ASC LIMIT 1
      ) ph ON true
      WHERE p.status = 'disponible' AND s.is_verified AND s.location IS NOT NULL
        AND p.created_at >= now() - make_interval(days => ${RECENT_DAYS})
        AND ST_DWithin(s.location::geography,
                       ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusMeters})
        AND p.id NOT IN (SELECT pet_id FROM favorites WHERE user_id = ${userId})
        AND p.id NOT IN (SELECT pet_id FROM applications WHERE user_id = ${userId})
      ORDER BY CASE WHEN ${preferredSpecies}::text IS NOT NULL AND p.species = ${preferredSpecies}
                    THEN 0 ELSE 1 END,
               p.created_at DESC
      LIMIT ${DIGEST_SIZE}`.execute(this.db);

    return result.rows;
  }
}

function toItemDto(row: DigestRow): DigestItemDto {
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    breed: row.breed,
    ageCategory: row.age_category,
    sex: row.sex,
    photoUrl: row.photo_url,
    shelterName: row.shelter_name,
    shelterSlug: row.shelter_slug,
    distanceMeters: row.distance_m === null ? null : Math.round(row.distance_m),
    createdAt: toIso(row.created_at),
  };
}

/** Énumération française « a, b et c ». */
function joinFr(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]!}`;
}
