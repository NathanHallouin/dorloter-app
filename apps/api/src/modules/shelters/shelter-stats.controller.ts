/**
 * Back-office refuge : statistiques avancées (aide à la décision). Durée moyenne
 * publication -> adoption, taux de conversion, animaux en difficulté de
 * placement, histogramme des adoptions sur 12 mois. Permission `PetsRead`.
 */

import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'kysely';

import { DB, type Db } from '../../infra/database/database.module';
import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { ok, type ApiResponse } from '../../shared/api-response';
import { ShelterMembershipService } from './shelter-membership.service';

interface StatsDto {
  totals: { pets: number; available: number; adopted: number; reserved: number };
  adoptions: { thisMonth: number; thisYear: number; total: number };
  applications: { total: number; pending: number };
  /** Taux de conversion candidatures -> adoptions signées, en pourcentage (0-100). */
  conversionRate: number;
  /** Durée moyenne publication -> adoption signée, en jours. */
  avgDaysToAdoption: number | null;
  hardToPlace: {
    id: string;
    name: string;
    species: string;
    daysListed: number;
    applications: number;
  }[];
  adoptionsByMonth: { month: string; count: number }[];
}

@Controller('api/v1/shelter')
export class ShelterStatsController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly membership: ShelterMembershipService,
  ) {}

  @Get('stats')
  @Auth()
  async stats(@CurrentUser() current: CurrentUserInfo): Promise<ApiResponse<StatsDto>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'pets:read');

    // Totaux par statut d'animal.
    const totals = await this.db
      .selectFrom('pets')
      .select([
        sql<number>`count(*)`.as('pets'),
        sql<number>`count(*) FILTER (WHERE status = 'disponible')`.as('available'),
        sql<number>`count(*) FILTER (WHERE status = 'adopte')`.as('adopted'),
        sql<number>`count(*) FILTER (WHERE status = 'reserve')`.as('reserved'),
      ])
      .where('shelter_id', '=', shelterId)
      .executeTakeFirstOrThrow();

    // Candidatures reçues sur les animaux du refuge (en attente = 'envoyee').
    const applications = await this.db
      .selectFrom('applications')
      .select([
        sql<number>`count(*)`.as('total'),
        sql<number>`count(*) FILTER (WHERE status = 'envoyee')`.as('pending'),
      ])
      .where('pet_id', 'in', (eb) =>
        eb.selectFrom('pets').select('id').where('shelter_id', '=', shelterId),
      )
      .executeTakeFirstOrThrow();

    // Adoptions signées (contrats) : total, ce mois, cette année, + délai moyen.
    const adoptions = await this.db
      .selectFrom('contracts as c')
      .innerJoin('pets as p', 'p.id', 'c.pet_id')
      .select([
        sql<number>`count(*)`.as('total'),
        sql<number>`count(*) FILTER (WHERE c.signed_at >= date_trunc('month', now()))`.as(
          'this_month',
        ),
        sql<number>`count(*) FILTER (WHERE c.signed_at >= date_trunc('year', now()))`.as(
          'this_year',
        ),
        sql<
          number | null
        >`AVG(EXTRACT(EPOCH FROM (c.signed_at - p.created_at)) / 86400.0)::float8`.as('avg_days'),
      ])
      .where('c.shelter_id', '=', shelterId)
      .where('c.type', '=', 'adoption')
      .where('c.status', '=', 'signe')
      .where('c.signed_at', 'is not', null)
      .executeTakeFirstOrThrow();

    const conversionRate =
      applications.total > 0
        ? Math.round((adoptions.total / applications.total) * 100 * 100) / 100
        : 0;

    // Animaux en difficulté : disponibles depuis > 90 jours, peu de candidatures.
    const hardToPlace = await this.db
      .selectFrom('pets as p')
      .leftJoin('applications as a', 'a.pet_id', 'p.id')
      .select([
        'p.id',
        'p.name',
        'p.species',
        sql<number>`(CURRENT_DATE - p.created_at::date)::int`.as('days_listed'),
        sql<number>`count(a.id)`.as('applications'),
      ])
      .where('p.shelter_id', '=', shelterId)
      .where('p.status', '=', 'disponible')
      .where(sql<boolean>`p.created_at < now() - interval '90 days'`)
      .groupBy(['p.id', 'p.name', 'p.species', 'p.created_at'])
      .orderBy('applications', 'asc')
      .orderBy('days_listed', 'desc')
      .limit(10)
      .execute();

    // Histogramme des adoptions signées sur les 12 derniers mois.
    const byMonth = await sql<{ month: string; count: number }>`
      SELECT to_char(m, 'YYYY-MM') AS month, count(c.id) AS count
      FROM generate_series(date_trunc('month', now()) - interval '11 months',
                           date_trunc('month', now()), interval '1 month') AS m
      LEFT JOIN contracts c ON c.shelter_id = ${shelterId} AND c.type = 'adoption'
           AND c.status = 'signe' AND date_trunc('month', c.signed_at) = m
      GROUP BY m ORDER BY m`.execute(this.db);

    return ok({
      totals: {
        pets: totals.pets,
        available: totals.available,
        adopted: totals.adopted,
        reserved: totals.reserved,
      },
      adoptions: {
        thisMonth: adoptions.this_month,
        thisYear: adoptions.this_year,
        total: adoptions.total,
      },
      applications: { total: applications.total, pending: applications.pending },
      conversionRate,
      avgDaysToAdoption:
        adoptions.avg_days === null ? null : Math.round(adoptions.avg_days * 10) / 10,
      hardToPlace: hardToPlace.map((row) => ({
        id: row.id,
        name: row.name,
        species: row.species,
        daysListed: row.days_listed,
        applications: row.applications,
      })),
      adoptionsByMonth: byMonth.rows.map((row) => ({ month: row.month, count: row.count })),
    });
  }
}
