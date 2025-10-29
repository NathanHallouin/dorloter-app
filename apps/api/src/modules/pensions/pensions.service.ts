/**
 * Annuaire des pensions agréées : liste publique (fiches vérifiées), détail,
 * avis, réservations, back-office pension.
 */

import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';

import { DB, type Db } from '../../infra/database/database.module';
import { AppError } from '../../shared/app-error';
import { decodeCursor, encodeCursor } from '../../shared/cursor';
import { unique } from '../../shared/format';
import { UserDirectory } from '../identity/identity.directory';

export const PENSION_DEFAULT_LIMIT = 20;
export const PENSION_MAX_LIMIT = 100;

export interface PensionRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  siret: string;
  agrement_number: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  cover_url: string | null;
  accepts_cats: boolean;
  accepts_dogs: boolean;
  capacity_cats: number | null;
  capacity_dogs: number | null;
  price_per_day_cat: number | null;
  price_per_day_dog: number | null;
  services: unknown;
  opening_hours: string | null;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PensionPhotoRecord {
  id: string;
  pension_id: string;
  url: string;
  blur_data_url: string | null;
  is_primary: boolean;
  display_order: number;
  created_at: Date;
}

export interface PensionBookingRecord {
  id: string;
  pension_id: string;
  user_id: string;
  pet_name: string | null;
  species: string;
  start_date: string;
  end_date: string;
  nights: number;
  total_price: number | null;
  notes: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface PensionReviewRecord {
  id: string;
  pension_id: string;
  rating: number;
  comment: string | null;
  is_verified: boolean;
  created_at: Date;
}

/** Note moyenne + nombre d'avis publiés d'une pension. */
export interface Rating {
  average: number;
  count: number;
}

export interface PensionFilters {
  acceptsCats: boolean | null;
  acceptsDogs: boolean | null;
  search: string | null;
}

export interface PensionListItem {
  pension: PensionRecord;
  rating: Rating | null;
}

export interface PensionListPage {
  items: PensionListItem[];
  nextCursor: string | null;
}

export interface PensionDetail {
  pension: PensionRecord;
  photos: PensionPhotoRecord[];
  rating: Rating | null;
}

export interface BookingView {
  booking: PensionBookingRecord;
  pension: PensionRecord | null;
}

interface PensionCursor {
  ts: string;
  id: string;
}

function pensionColumns() {
  return [
    'id',
    'name',
    'slug',
    'description',
    'siret',
    'agrement_number',
    'address',
    sql<number | null>`ST_Y(location)`.as('lat'),
    sql<number | null>`ST_X(location)`.as('lng'),
    'phone',
    'email',
    'website',
    'logo_url',
    'cover_url',
    'accepts_cats',
    'accepts_dogs',
    'capacity_cats',
    'capacity_dogs',
    sql<number | null>`price_per_day_cat::float8`.as('price_per_day_cat'),
    sql<number | null>`price_per_day_dog::float8`.as('price_per_day_dog'),
    'services',
    'opening_hours',
    'is_verified',
    'created_at',
    'updated_at',
  ] as const;
}

function bookingColumns() {
  return [
    'id',
    'pension_id',
    'user_id',
    'pet_name',
    'species',
    'start_date',
    'end_date',
    'nights',
    sql<number | null>`total_price::float8`.as('total_price'),
    'notes',
    'status',
    'created_at',
    'updated_at',
  ] as const;
}

@Injectable()
export class PensionsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly users: UserDirectory,
  ) {}

  // --- Annuaire public --------------------------------------------------------------

  async list(
    filters: PensionFilters,
    cursorParam: string | null,
    limit: number,
  ): Promise<PensionListPage> {
    let query = this.db
      .selectFrom('pensions')
      .select(pensionColumns())
      .where('is_verified', '=', true);

    if (filters.acceptsCats === true) query = query.where('accepts_cats', '=', true);
    if (filters.acceptsDogs === true) query = query.where('accepts_dogs', '=', true);
    if (filters.search !== null) {
      const term = `%${filters.search}%`;
      query = query.where((eb) =>
        eb.or([eb('name', 'ilike', term), eb('description', 'ilike', term)]),
      );
    }

    const cursor = decodeCursor<PensionCursor>(cursorParam);
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
    const pensions = hasMore ? rows.slice(0, limit) : rows;
    const last = hasMore ? pensions[pensions.length - 1] : undefined;
    const nextCursor = last
      ? encodeCursor<PensionCursor>({ ts: last.created_at.toISOString(), id: last.id })
      : null;

    const ratings = await this.ratingsOf(pensions.map((pension) => pension.id));
    return {
      items: pensions.map((pension) => ({
        pension,
        rating: ratings.get(pension.id) ?? null,
      })),
      nextCursor,
    };
  }

  async getBySlug(slug: string): Promise<PensionDetail> {
    const pension = await this.db
      .selectFrom('pensions')
      .select(pensionColumns())
      .where('slug', '=', slug)
      .where('is_verified', '=', true)
      .executeTakeFirst();
    if (!pension) throw AppError.notFoundId('Pension', slug);

    const photos = await this.db
      .selectFrom('pension_photos')
      .select([
        'id',
        'pension_id',
        'url',
        'blur_data_url',
        'is_primary',
        sql<number>`"order"`.as('display_order'),
        'created_at',
      ])
      .where('pension_id', '=', pension.id)
      .orderBy('is_primary', 'desc')
      .orderBy('order', 'asc')
      .execute();

    const ratings = await this.ratingsOf([pension.id]);
    return { pension, photos, rating: ratings.get(pension.id) ?? null };
  }

  // --- Avis ---------------------------------------------------------------------------

  async addReview(
    userId: string,
    pensionId: string,
    rating: number,
    comment: string | null,
  ): Promise<PensionReviewRecord> {
    const exists = await this.db
      .selectFrom('pensions')
      .select('id')
      .where('id', '=', pensionId)
      .executeTakeFirst();
    if (!exists) throw AppError.notFoundId('Pension', pensionId);

    const already = await this.db
      .selectFrom('pension_reviews')
      .select('id')
      .where('pension_id', '=', pensionId)
      .where('user_id', '=', userId)
      .executeTakeFirst();
    if (already) throw AppError.conflict('Vous avez déjà laissé un avis sur cette pension.');

    return this.db
      .insertInto('pension_reviews')
      .values({
        pension_id: pensionId,
        user_id: userId,
        rating,
        comment,
        is_published: true,
      })
      .returning(['id', 'pension_id', 'rating', 'comment', 'is_verified', 'created_at'])
      .executeTakeFirstOrThrow();
  }

  // --- Réservations ---------------------------------------------------------------------

  async createBooking(
    userId: string,
    pensionId: string,
    species: string,
    petName: string | null,
    start: string,
    end: string,
    notes: string | null,
  ): Promise<BookingView> {
    const pension = await this.db
      .selectFrom('pensions')
      .select(pensionColumns())
      .where('id', '=', pensionId)
      .where('is_verified', '=', true)
      .executeTakeFirst();
    if (!pension) throw AppError.notFoundId('Pension', pensionId);

    if (end < start) {
      throw AppError.unprocessable("La date de départ doit suivre la date d'arrivée.");
    }
    if (species === 'chat' && !pension.accepts_cats) {
      throw AppError.unprocessable("Cette pension n'accueille pas les chats.");
    }
    if (species === 'chien' && !pension.accepts_dogs) {
      throw AppError.unprocessable("Cette pension n'accueille pas les chiens.");
    }

    const nights = Math.max(nightsBetween(start, end), 1);
    const perDay = species === 'chat' ? pension.price_per_day_cat : pension.price_per_day_dog;
    const total = perDay === null ? null : perDay * nights;

    const booking = await this.db
      .insertInto('pension_bookings')
      .values({
        pension_id: pensionId,
        user_id: userId,
        species,
        pet_name: petName,
        start_date: start,
        end_date: end,
        nights,
        total_price: total,
        notes,
        status: 'envoyee',
      })
      .returning(bookingColumns())
      .executeTakeFirstOrThrow();

    return { booking, pension };
  }

  async myBookings(userId: string): Promise<BookingView[]> {
    const bookings = await this.db
      .selectFrom('pension_bookings')
      .select(bookingColumns())
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .execute();
    return this.attachPensions(bookings);
  }

  // --- Back-office pension --------------------------------------------------------------

  async pensionBookings(userId: string): Promise<BookingView[]> {
    const pensionId = await this.requirePension(userId);
    const bookings = await this.db
      .selectFrom('pension_bookings')
      .select(bookingColumns())
      .where('pension_id', '=', pensionId)
      .orderBy('start_date', 'desc')
      .execute();
    return this.attachPensions(bookings);
  }

  async setBookingStatus(
    userId: string,
    bookingId: string,
    status: string,
  ): Promise<BookingView> {
    const pensionId = await this.requirePension(userId);
    const owner = await this.db
      .selectFrom('pension_bookings')
      .select('pension_id')
      .where('id', '=', bookingId)
      .executeTakeFirst();
    if (!owner) throw AppError.notFoundId('Réservation', bookingId);
    if (owner.pension_id !== pensionId) {
      throw AppError.forbidden('Cette réservation ne concerne pas votre pension.');
    }

    const booking = await this.db
      .updateTable('pension_bookings')
      .set({ status, updated_at: new Date() })
      .where('id', '=', bookingId)
      .returning(bookingColumns())
      .executeTakeFirstOrThrow();

    const pension = await this.db
      .selectFrom('pensions')
      .select(pensionColumns())
      .where('id', '=', pensionId)
      .executeTakeFirst();
    return { booking, pension: pension ?? null };
  }

  // --- Internes ---------------------------------------------------------------------------

  private async requirePension(userId: string): Promise<string> {
    const pensionId = await this.users.pensionIdOf(userId);
    if (pensionId === null) throw AppError.forbidden('Accès pension requis.');
    return pensionId;
  }

  private async attachPensions(bookings: PensionBookingRecord[]): Promise<BookingView[]> {
    if (bookings.length === 0) return [];
    const rows = await this.db
      .selectFrom('pensions')
      .select(pensionColumns())
      .where(
        'id',
        'in',
        unique(bookings.map((booking) => booking.pension_id)),
      )
      .execute();
    const byId = new Map(rows.map((pension) => [pension.id, pension]));
    return bookings.map((booking) => ({
      booking,
      pension: byId.get(booking.pension_id) ?? null,
    }));
  }

  /** Note moyenne (arrondie à 2 décimales) + nombre d'avis publiés, par pension. */
  private async ratingsOf(ids: string[]): Promise<Map<string, Rating>> {
    const map = new Map<string, Rating>();
    if (ids.length === 0) return map;
    const rows = await this.db
      .selectFrom('pension_reviews')
      .select([
        'pension_id',
        sql<number>`AVG(rating)::float8`.as('average'),
        sql<number>`COUNT(*)`.as('count'),
      ])
      .where('is_published', '=', true)
      .where('pension_id', 'in', ids)
      .groupBy('pension_id')
      .execute();
    for (const row of rows) {
      map.set(row.pension_id, {
        average: Math.round(row.average * 100) / 100,
        count: row.count,
      });
    }
    return map;
  }
}

/** Nombre de nuits entre deux dates civiles `yyyy-mm-dd`. */
function nightsBetween(start: string, end: string): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / MS_PER_DAY);
}
