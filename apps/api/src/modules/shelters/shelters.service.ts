/**
 * Annuaire public des refuges (vérifiés), fiche back-office (profil), réglages
 * et suivi de refuges. La géolocalisation est lue via `ST_Y`/`ST_X`.
 */

import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';

import { DB, type Db } from '../../infra/database/database.module';
import { AppError } from '../../shared/app-error';
import { decodeCursor, encodeCursor } from '../../shared/cursor';
import { ShelterMembershipService } from './shelter-membership.service';

const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/** Refuge tel que lu en base (géo décomposée en lat/lng). */
export interface ShelterRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  mission_long: string | null;
  founded_year: number | null;
  siret: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  donation_url: string | null;
  donation_label: string | null;
  donation_description: string | null;
  visit_hours: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  cover_url: string | null;
  is_verified: boolean;
  accepts_foster_applications: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ShelterListPage {
  items: ShelterRecord[];
  nextCursor: string | null;
}

/** Champs éditables de la fiche refuge (déjà nettoyés côté contrôleur). */
export interface ProfileCommand {
  name: string;
  description: string | null;
  missionLong: string | null;
  foundedYear: number | null;
  siret: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  visitHours: string | null;
  donationUrl: string | null;
  donationLabel: string | null;
  donationDescription: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
}

interface ShelterCursor {
  ts: string;
  id: string;
}

export function shelterColumns() {
  return [
    'id',
    'name',
    'slug',
    'description',
    'mission_long',
    'founded_year',
    'siret',
    'address',
    sql<number | null>`ST_Y(location)`.as('lat'),
    sql<number | null>`ST_X(location)`.as('lng'),
    'donation_url',
    'donation_label',
    'donation_description',
    'visit_hours',
    'phone',
    'email',
    'website',
    'logo_url',
    'cover_url',
    'is_verified',
    'accepts_foster_applications',
    'created_at',
    'updated_at',
  ] as const;
}

@Injectable()
export class SheltersService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly membership: ShelterMembershipService,
  ) {}

  // --- Annuaire public ------------------------------------------------------------

  async list(
    search: string | null,
    cursorParam: string | null,
    limit: number,
  ): Promise<ShelterListPage> {
    let query = this.db.selectFrom('shelters').select(shelterColumns()).where('is_verified', '=', true);

    if (search !== null) {
      const term = `%${search}%`;
      query = query.where((eb) =>
        eb.or([eb('name', 'ilike', term), eb('description', 'ilike', term)]),
      );
    }

    const cursor = decodeCursor<ShelterCursor>(cursorParam);
    if (cursor !== null) {
      const ts = new Date(cursor.ts);
      query = query.where((eb) =>
        eb.or([
          eb('created_at', '<', ts),
          eb.and([eb('created_at', '=', ts), eb('id', '<', cursor.id)]),
        ]),
      );
    }

    const rows = await query
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .limit(limit + 1)
      .execute();

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = hasMore ? items[items.length - 1] : undefined;
    const nextCursor = last
      ? encodeCursor<ShelterCursor>({ ts: last.created_at.toISOString(), id: last.id })
      : null;

    return { items, nextCursor };
  }

  async getBySlug(slug: string): Promise<ShelterRecord> {
    const shelter = await this.db
      .selectFrom('shelters')
      .select(shelterColumns())
      .where('slug', '=', slug)
      .where('is_verified', '=', true)
      .executeTakeFirst();
    if (!shelter) throw AppError.notFoundId('Refuge', slug);
    return shelter;
  }

  // --- Back-office : fiche du refuge du membre ------------------------------------

  async getMine(userId: string): Promise<ShelterRecord> {
    const shelterId = await this.membership.primaryShelterOf(userId);
    if (shelterId === null) throw AppError.forbidden('Accès à un espace refuge requis.');
    return this.load(shelterId);
  }

  async updateProfile(userId: string, cmd: ProfileCommand): Promise<ShelterRecord> {
    const shelterId = await this.membership.requireAccess(userId, 'profile:write');
    const shelter = await this.db
      .updateTable('shelters')
      .set({
        name: cmd.name,
        description: cmd.description,
        mission_long: cmd.missionLong,
        founded_year: cmd.foundedYear,
        siret: cmd.siret,
        address: cmd.address,
        phone: cmd.phone,
        email: cmd.email,
        website: cmd.website,
        visit_hours: cmd.visitHours,
        donation_url: cmd.donationUrl,
        donation_label: cmd.donationLabel,
        donation_description: cmd.donationDescription,
        logo_url: cmd.logoUrl,
        cover_url: cmd.coverUrl,
        updated_at: new Date(),
      })
      .where('id', '=', shelterId)
      .returning(shelterColumns())
      .executeTakeFirst();
    if (!shelter) throw AppError.notFoundId('Refuge', shelterId);
    return shelter;
  }

  // --- Réglage « familles d'accueil ouvertes » ------------------------------------

  async fosteringOpen(userId: string): Promise<boolean> {
    const shelterId = await this.membership.requireAccess(userId, 'fosters:read');
    const row = await this.db
      .selectFrom('shelters')
      .select('accepts_foster_applications')
      .where('id', '=', shelterId)
      .executeTakeFirst();
    return row?.accepts_foster_applications ?? false;
  }

  async setFosteringOpen(userId: string, open: boolean): Promise<void> {
    const shelterId = await this.membership.requireAccess(userId, 'fosters:write');
    const result = await this.db
      .updateTable('shelters')
      .set({ accepts_foster_applications: open, updated_at: new Date() })
      .where('id', '=', shelterId)
      .executeTakeFirst();
    if (result.numUpdatedRows === 0n) throw AppError.notFoundId('Refuge', shelterId);
  }

  // --- Suivi de refuges -----------------------------------------------------------

  async follow(userId: string, shelterId: string): Promise<void> {
    const exists = await this.db
      .selectFrom('shelters')
      .select('id')
      .where('id', '=', shelterId)
      .executeTakeFirst();
    if (!exists) throw AppError.notFoundId('Refuge', shelterId);
    await this.db
      .insertInto('shelter_follows')
      .values({ user_id: userId, shelter_id: shelterId })
      .onConflict((oc) => oc.doNothing())
      .execute();
  }

  async unfollow(userId: string, shelterId: string): Promise<void> {
    await this.db
      .deleteFrom('shelter_follows')
      .where('user_id', '=', userId)
      .where('shelter_id', '=', shelterId)
      .execute();
  }

  async listFollowed(userId: string): Promise<ShelterRecord[]> {
    // Préserve l'ordre « suivi le plus récent d'abord ». Colonnes qualifiées :
    // `created_at` existe des deux côtés de la jointure.
    return this.db
      .selectFrom('shelters as s')
      .innerJoin('shelter_follows as f', 'f.shelter_id', 's.id')
      .select([
        's.id',
        's.name',
        's.slug',
        's.description',
        's.mission_long',
        's.founded_year',
        's.siret',
        's.address',
        sql<number | null>`ST_Y(s.location)`.as('lat'),
        sql<number | null>`ST_X(s.location)`.as('lng'),
        's.donation_url',
        's.donation_label',
        's.donation_description',
        's.visit_hours',
        's.phone',
        's.email',
        's.website',
        's.logo_url',
        's.cover_url',
        's.is_verified',
        's.accepts_foster_applications',
        's.created_at',
        's.updated_at',
      ])
      .where('f.user_id', '=', userId)
      .orderBy('f.created_at', 'desc')
      .execute();
  }

  private async load(shelterId: string): Promise<ShelterRecord> {
    const shelter = await this.db
      .selectFrom('shelters')
      .select(shelterColumns())
      .where('id', '=', shelterId)
      .executeTakeFirst();
    if (!shelter) throw AppError.notFoundId('Refuge', shelterId);
    return shelter;
  }
}

export { DEFAULT_LIMIT as SHELTER_DEFAULT_LIMIT };
