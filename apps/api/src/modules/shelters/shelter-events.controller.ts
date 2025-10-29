/**
 * Back-office refuge : événements et opérations terrain (collectes, journées
 * d'adoption...) + inscriptions bénévoles + événements publics de la fiche
 * refuge. Permissions `Events*`.
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { sql } from 'kysely';

import { DB, type Db } from '../../infra/database/database.module';
import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { ok, type ApiResponse } from '../../shared/api-response';
import { AppError } from '../../shared/app-error';
import { ensureValue, EVENT_TYPE, SIGNUP_STATUS } from '../../shared/db-enum';
import { toIso, toIsoOrNull } from '../../shared/format';
import { ShelterMembershipService } from './shelter-membership.service';
import { SheltersService } from './shelters.service';

export class CreateEventDto {
  @IsString({ message: 'Titre invalide.' })
  @Length(1, 200, { message: 'Le titre est requis.' })
  title!: string;

  @IsOptional() @IsString({ message: "Type d'événement invalide." }) type?: string;
  @IsDateString({}, { message: 'Date de début invalide.' }) startsAt!: string;
  @IsOptional() @IsDateString({}, { message: 'Date de fin invalide.' }) endsAt?: string;
  @IsOptional() @IsString() @Length(0, 255, { message: 'Lieu trop long.' }) location?: string;
  @IsOptional() @IsBoolean({ message: 'Valeur invalide.' }) isPublic?: boolean;
  @IsOptional() @IsInt({ message: 'Capacité invalide.' }) capacity?: number;
  @IsOptional() @IsString() needs?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateEventDto {
  @IsOptional() @IsString() @Length(1, 200, { message: 'Titre invalide.' }) title?: string;
  @IsOptional() @IsString({ message: "Type d'événement invalide." }) type?: string;
  @IsOptional() @IsDateString({}, { message: 'Date de début invalide.' }) startsAt?: string;
  @IsOptional() @IsDateString({}, { message: 'Date de fin invalide.' }) endsAt?: string;
  @IsOptional() @IsString() @Length(0, 255, { message: 'Lieu trop long.' }) location?: string;
  @IsOptional() @IsBoolean({ message: 'Valeur invalide.' }) isPublic?: boolean;
  @IsOptional() @IsInt({ message: 'Capacité invalide.' }) capacity?: number;
  @IsOptional() @IsString() needs?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsNumber({}, { message: 'Montant invalide.' }) resultAmount?: number;
  @IsOptional() @IsString() resultNotes?: string;
}

export class CreateEventSignupDto {
  @IsString({ message: 'Bénévole invalide.' })
  volunteerId!: string;
}

export class UpdateEventSignupDto {
  @IsString({ message: 'Statut invalide.' })
  status!: string;
}

interface EventDto {
  id: string;
  title: string;
  type: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  isPublic: boolean;
  capacity: number | null;
  needs: string | null;
  notes: string | null;
  resultAmount: number | null;
  resultNotes: string | null;
  createdAt: string;
}

const EVENT_COLUMNS = [
  'id',
  'title',
  'type',
  'starts_at',
  'ends_at',
  'location',
  'is_public',
  'capacity',
  'needs',
  'notes',
  'result_notes',
  'created_at',
] as const;

function eventSelection() {
  return [...EVENT_COLUMNS, sql<number | null>`result_amount::float8`.as('result_amount')] as const;
}

@Controller('api/v1')
export class ShelterEventsController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly membership: ShelterMembershipService,
    private readonly shelters: SheltersService,
  ) {}

  @Get('shelter/events')
  @Auth()
  async list(@CurrentUser() current: CurrentUserInfo): Promise<ApiResponse<EventDto[]>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'events:read');
    const rows = await this.db
      .selectFrom('events')
      .select(eventSelection())
      .where('shelter_id', '=', shelterId)
      .orderBy('starts_at', 'desc')
      .execute();
    return ok(rows.map(toEventDto));
  }

  @Post('shelter/events')
  @Auth()
  async create(
    @CurrentUser() current: CurrentUserInfo,
    @Body() dto: CreateEventDto,
  ): Promise<ApiResponse<EventDto>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'events:write');
    if (dto.title.trim() === '') throw AppError.unprocessable('Le titre est requis.');
    const type = ensureValue(dto.type ?? 'collecte', EVENT_TYPE, "type d'événement");
    const row = await this.db
      .insertInto('events')
      .values({
        shelter_id: shelterId,
        title: dto.title.trim(),
        type,
        starts_at: new Date(dto.startsAt),
        ends_at: dto.endsAt ? new Date(dto.endsAt) : null,
        location: dto.location ?? null,
        is_public: dto.isPublic ?? false,
        capacity: dto.capacity ?? null,
        needs: dto.needs ?? null,
        notes: dto.notes ?? null,
      })
      .returning(eventSelection())
      .executeTakeFirstOrThrow();
    return ok(toEventDto(row));
  }

  @Patch('shelter/events/:id')
  @Auth()
  async update(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
  ): Promise<ApiResponse<EventDto>> {
    await this.requireOwnedEvent(current.userId, id, 'events:write');
    const type =
      dto.type === undefined
        ? undefined
        : ensureValue(dto.type, EVENT_TYPE, "type d'événement");
    const row = await this.db
      .updateTable('events')
      .set((eb) => ({
        title: dto.title?.trim() ?? eb.ref('title'),
        type: type ?? eb.ref('type'),
        starts_at: dto.startsAt ? new Date(dto.startsAt) : eb.ref('starts_at'),
        ends_at: dto.endsAt ? new Date(dto.endsAt) : eb.ref('ends_at'),
        location: dto.location ?? eb.ref('location'),
        is_public: dto.isPublic ?? eb.ref('is_public'),
        capacity: dto.capacity ?? eb.ref('capacity'),
        needs: dto.needs ?? eb.ref('needs'),
        notes: dto.notes ?? eb.ref('notes'),
        result_amount: dto.resultAmount ?? eb.ref('result_amount'),
        result_notes: dto.resultNotes ?? eb.ref('result_notes'),
        updated_at: new Date(),
      }))
      .where('id', '=', id)
      .returning(eventSelection())
      .executeTakeFirstOrThrow();
    return ok(toEventDto(row));
  }

  @Delete('shelter/events/:id')
  @Auth()
  async remove(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<null>> {
    await this.requireOwnedEvent(current.userId, id, 'events:write');
    await this.db.deleteFrom('events').where('id', '=', id).execute();
    return ok(null);
  }

  // --- Inscriptions ----------------------------------------------------------------

  @Get('shelter/events/:eventId/signups')
  @Auth()
  async listSignups(
    @CurrentUser() current: CurrentUserInfo,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<
    ApiResponse<
      { id: string; eventId: string; volunteerId: string; volunteerName: string; status: string }[]
    >
  > {
    await this.requireOwnedEvent(current.userId, eventId, 'events:read');
    const rows = await this.db
      .selectFrom('event_signups as s')
      .innerJoin('volunteers as v', 'v.id', 's.volunteer_id')
      .select(['s.id', 's.event_id', 's.volunteer_id', 'v.name as volunteer_name', 's.status'])
      .where('s.event_id', '=', eventId)
      .execute();
    return ok(
      rows.map((row) => ({
        id: row.id,
        eventId: row.event_id,
        volunteerId: row.volunteer_id,
        volunteerName: row.volunteer_name,
        status: row.status,
      })),
    );
  }

  @Post('shelter/events/:eventId/signups')
  @Auth()
  async signup(
    @CurrentUser() current: CurrentUserInfo,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateEventSignupDto,
  ): Promise<ApiResponse<null>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'events:write');
    const eventOwner = await this.db
      .selectFrom('events')
      .select('shelter_id')
      .where('id', '=', eventId)
      .executeTakeFirst();
    if (!eventOwner) throw AppError.notFoundId('Événement', eventId);
    const volunteerOwner = await this.db
      .selectFrom('volunteers')
      .select('shelter_id')
      .where('id', '=', dto.volunteerId)
      .executeTakeFirst();
    if (!volunteerOwner) throw AppError.notFoundId('Bénévole', dto.volunteerId);
    if (eventOwner.shelter_id !== shelterId || volunteerOwner.shelter_id !== shelterId) {
      throw AppError.forbidden('Événement ou bénévole hors de votre refuge.');
    }

    const duplicate = await this.db
      .selectFrom('event_signups')
      .select('id')
      .where('event_id', '=', eventId)
      .where('volunteer_id', '=', dto.volunteerId)
      .executeTakeFirst();
    if (duplicate) throw AppError.conflict('Ce bénévole est déjà inscrit à cet événement.');

    await this.db
      .insertInto('event_signups')
      .values({ event_id: eventId, volunteer_id: dto.volunteerId, status: 'inscrit' })
      .execute();
    return ok(null);
  }

  @Patch('shelter/event-signups/:id')
  @Auth()
  async updateSignup(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventSignupDto,
  ): Promise<ApiResponse<null>> {
    await this.requireOwnedSignup(current.userId, id);
    const status = ensureValue(dto.status, SIGNUP_STATUS, 'statut');
    await this.db
      .updateTable('event_signups')
      .set({ status })
      .where('id', '=', id)
      .execute();
    return ok(null);
  }

  @Delete('shelter/event-signups/:id')
  @Auth()
  async removeSignup(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<null>> {
    await this.requireOwnedSignup(current.userId, id);
    await this.db.deleteFrom('event_signups').where('id', '=', id).execute();
    return ok(null);
  }

  // --- Public ------------------------------------------------------------------------

  /** Événements publics à venir d'un refuge (fiche publique). */
  @Get('shelters/:slug/events')
  async publicEvents(@Param('slug') slug: string): Promise<
    ApiResponse<
      {
        id: string;
        title: string;
        type: string;
        startsAt: string;
        endsAt: string | null;
        location: string | null;
        needs: string | null;
      }[]
    >
  > {
    const shelter = await this.shelters.getBySlug(slug);
    const rows = await this.db
      .selectFrom('events')
      .select(['id', 'title', 'type', 'starts_at', 'ends_at', 'location', 'needs'])
      .where('shelter_id', '=', shelter.id)
      .where('is_public', '=', true)
      .where(sql<boolean>`starts_at >= now() - interval '12 hours'`)
      .orderBy('starts_at', 'asc')
      .limit(12)
      .execute();
    return ok(
      rows.map((row) => ({
        id: row.id,
        title: row.title,
        type: row.type,
        startsAt: toIso(row.starts_at),
        endsAt: toIsoOrNull(row.ends_at),
        location: row.location,
        needs: row.needs,
      })),
    );
  }

  // --- Helpers -----------------------------------------------------------------------

  private async requireOwnedEvent(
    userId: string,
    eventId: string,
    permission: 'events:read' | 'events:write',
  ): Promise<void> {
    const shelterId = await this.membership.requireAccess(userId, permission);
    const row = await this.db
      .selectFrom('events')
      .select('shelter_id')
      .where('id', '=', eventId)
      .executeTakeFirst();
    if (!row) throw AppError.notFoundId('Événement', eventId);
    if (row.shelter_id !== shelterId) {
      throw AppError.forbidden('Cet événement ne concerne pas votre refuge.');
    }
  }

  /** Vérifie qu'une inscription appartient à un événement du refuge du membre. */
  private async requireOwnedSignup(userId: string, signupId: string): Promise<void> {
    const shelterId = await this.membership.requireAccess(userId, 'events:write');
    const row = await this.db
      .selectFrom('event_signups as s')
      .innerJoin('events as e', 'e.id', 's.event_id')
      .select('e.shelter_id')
      .where('s.id', '=', signupId)
      .executeTakeFirst();
    if (!row) throw AppError.notFoundId('Inscription', signupId);
    if (row.shelter_id !== shelterId) {
      throw AppError.forbidden('Cette inscription ne concerne pas votre refuge.');
    }
  }
}

function toEventDto(row: {
  id: string;
  title: string;
  type: string;
  starts_at: Date;
  ends_at: Date | null;
  location: string | null;
  is_public: boolean;
  capacity: number | null;
  needs: string | null;
  notes: string | null;
  result_amount: number | null;
  result_notes: string | null;
  created_at: Date;
}): EventDto {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    startsAt: toIso(row.starts_at),
    endsAt: toIsoOrNull(row.ends_at),
    location: row.location,
    isPublic: row.is_public,
    capacity: row.capacity,
    needs: row.needs,
    notes: row.notes,
    resultAmount: row.result_amount,
    resultNotes: row.result_notes,
    createdAt: toIso(row.created_at),
  };
}
