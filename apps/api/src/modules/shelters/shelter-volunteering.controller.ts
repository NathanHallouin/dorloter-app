/**
 * Back-office refuge : bénévoles, planning des permanences (créneaux) et
 * inscriptions + candidature bénévole publique depuis la fiche refuge.
 * Permissions `Volunteers*`.
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Length } from 'class-validator';
import { sql } from 'kysely';

import { DB, type Db } from '../../infra/database/database.module';
import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { ok, type ApiResponse } from '../../shared/api-response';
import { AppError } from '../../shared/app-error';
import { ensureValue, SHIFT_KIND, SIGNUP_STATUS, VOLUNTEER_STATUS } from '../../shared/db-enum';
import { clean, toIso, toIsoOrNull } from '../../shared/format';
import { UserDirectory } from '../identity/identity.directory';
import { ShelterMembershipService } from './shelter-membership.service';

// --- Requêtes -------------------------------------------------------------------

export class CreateVolunteerDto {
  @IsString({ message: 'Nom invalide.' })
  @Length(1, 255, { message: 'Le nom est requis.' })
  name!: string;

  @IsOptional() @IsString() @Length(0, 255, { message: 'Email trop long.' }) email?: string;
  @IsOptional() @IsString() @Length(0, 40, { message: 'Téléphone trop long.' }) phone?: string;
  @IsOptional() @IsString() skills?: string;
  @IsOptional() @IsString() availability?: string;
  @IsOptional() @IsString({ message: 'Statut invalide.' }) status?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateVolunteerDto {
  @IsOptional() @IsString() @Length(1, 255, { message: 'Nom invalide.' }) name?: string;
  @IsOptional() @IsString() @Length(0, 255, { message: 'Email trop long.' }) email?: string;
  @IsOptional() @IsString() @Length(0, 40, { message: 'Téléphone trop long.' }) phone?: string;
  @IsOptional() @IsString() skills?: string;
  @IsOptional() @IsString() availability?: string;
  @IsOptional() @IsString({ message: 'Statut invalide.' }) status?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateShiftDto {
  @IsString({ message: 'Titre invalide.' })
  @Length(1, 200, { message: 'Le titre est requis.' })
  title!: string;

  @IsOptional() @IsString({ message: 'Type de créneau invalide.' }) kind?: string;
  @IsDateString({}, { message: 'Date de début invalide.' }) startsAt!: string;
  @IsOptional() @IsDateString({}, { message: 'Date de fin invalide.' }) endsAt?: string;
  @IsOptional() @IsString() @Length(0, 255, { message: 'Lieu trop long.' }) location?: string;
  @IsOptional() @IsInt({ message: 'Capacité invalide.' }) capacity?: number;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateShiftDto {
  @IsOptional() @IsString() @Length(1, 200, { message: 'Titre invalide.' }) title?: string;
  @IsOptional() @IsString({ message: 'Type de créneau invalide.' }) kind?: string;
  @IsOptional() @IsDateString({}, { message: 'Date de début invalide.' }) startsAt?: string;
  @IsOptional() @IsDateString({}, { message: 'Date de fin invalide.' }) endsAt?: string;
  @IsOptional() @IsString() @Length(0, 255, { message: 'Lieu trop long.' }) location?: string;
  @IsOptional() @IsInt({ message: 'Capacité invalide.' }) capacity?: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateSignupDto {
  @IsString({ message: 'Bénévole invalide.' })
  volunteerId!: string;
}

export class UpdateSignupDto {
  @IsOptional() @IsString({ message: 'Statut invalide.' }) status?: string;
  @IsOptional() @IsNumber({}, { message: "Nombre d'heures invalide." }) hours?: number;
}

export class VolunteerApplicationDto {
  @IsOptional() @IsString() @Length(0, 500, { message: 'Compétences trop longues.' })
  skills?: string;

  @IsOptional() @IsString() @Length(0, 500, { message: 'Disponibilités trop longues.' })
  availability?: string;

  @IsOptional() @IsString() @Length(0, 2000, { message: 'Message trop long.' })
  message?: string;
}

// --- Réponses -------------------------------------------------------------------

interface VolunteerDto {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  skills: string | null;
  availability: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

interface ShiftDto {
  id: string;
  title: string;
  kind: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  capacity: number | null;
  notes: string | null;
}

interface SignupDto {
  id: string;
  shiftId: string;
  volunteerId: string;
  volunteerName: string;
  status: string;
  hours: number | null;
}

const VOLUNTEER_COLUMNS = [
  'id',
  'name',
  'email',
  'phone',
  'skills',
  'availability',
  'status',
  'notes',
  'created_at',
] as const;

const SHIFT_COLUMNS = [
  'id',
  'title',
  'kind',
  'starts_at',
  'ends_at',
  'location',
  'capacity',
  'notes',
] as const;

@Controller('api/v1')
export class ShelterVolunteeringController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly membership: ShelterMembershipService,
    private readonly users: UserDirectory,
  ) {}

  // --- Bénévoles -----------------------------------------------------------------

  @Get('shelter/volunteers')
  @Auth()
  async listVolunteers(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<VolunteerDto[]>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'volunteers:read');
    const rows = await this.db
      .selectFrom('volunteers')
      .select(VOLUNTEER_COLUMNS)
      .where('shelter_id', '=', shelterId)
      .orderBy('name')
      .execute();
    return ok(rows.map(toVolunteerDto));
  }

  @Post('shelter/volunteers')
  @Auth()
  async createVolunteer(
    @CurrentUser() current: CurrentUserInfo,
    @Body() dto: CreateVolunteerDto,
  ): Promise<ApiResponse<VolunteerDto>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'volunteers:write');
    if (dto.name.trim() === '') throw AppError.unprocessable('Le nom est requis.');
    const status = ensureValue(dto.status ?? 'active', VOLUNTEER_STATUS, 'statut');
    const row = await this.db
      .insertInto('volunteers')
      .values({
        shelter_id: shelterId,
        name: dto.name.trim(),
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        skills: dto.skills ?? null,
        availability: dto.availability ?? null,
        status,
        notes: dto.notes ?? null,
      })
      .returning(VOLUNTEER_COLUMNS)
      .executeTakeFirstOrThrow();
    return ok(toVolunteerDto(row));
  }

  @Patch('shelter/volunteers/:id')
  @Auth()
  async updateVolunteer(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVolunteerDto,
  ): Promise<ApiResponse<VolunteerDto>> {
    await this.requireOwned('volunteers', current.userId, id, 'Bénévole', 'volunteers:write');
    const status =
      dto.status === undefined
        ? undefined
        : ensureValue(dto.status, VOLUNTEER_STATUS, 'statut');
    const row = await this.db
      .updateTable('volunteers')
      .set((eb) => ({
        name: dto.name?.trim() ?? eb.ref('name'),
        email: dto.email ?? eb.ref('email'),
        phone: dto.phone ?? eb.ref('phone'),
        skills: dto.skills ?? eb.ref('skills'),
        availability: dto.availability ?? eb.ref('availability'),
        status: status ?? eb.ref('status'),
        notes: dto.notes ?? eb.ref('notes'),
        updated_at: new Date(),
      }))
      .where('id', '=', id)
      .returning(VOLUNTEER_COLUMNS)
      .executeTakeFirstOrThrow();
    return ok(toVolunteerDto(row));
  }

  @Delete('shelter/volunteers/:id')
  @Auth()
  async deleteVolunteer(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<null>> {
    await this.requireOwned('volunteers', current.userId, id, 'Bénévole', 'volunteers:write');
    await this.db.deleteFrom('volunteers').where('id', '=', id).execute();
    return ok(null);
  }

  // --- Créneaux -------------------------------------------------------------------

  @Get('shelter/shifts')
  @Auth()
  async listShifts(@CurrentUser() current: CurrentUserInfo): Promise<ApiResponse<ShiftDto[]>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'volunteers:read');
    const rows = await this.db
      .selectFrom('volunteer_shifts')
      .select(SHIFT_COLUMNS)
      .where('shelter_id', '=', shelterId)
      .orderBy('starts_at')
      .execute();
    return ok(rows.map(toShiftDto));
  }

  @Post('shelter/shifts')
  @Auth()
  async createShift(
    @CurrentUser() current: CurrentUserInfo,
    @Body() dto: CreateShiftDto,
  ): Promise<ApiResponse<ShiftDto>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'volunteers:write');
    if (dto.title.trim() === '') throw AppError.unprocessable('Le titre est requis.');
    const kind = ensureValue(dto.kind ?? 'permanence', SHIFT_KIND, 'type de créneau');
    const row = await this.db
      .insertInto('volunteer_shifts')
      .values({
        shelter_id: shelterId,
        title: dto.title.trim(),
        kind,
        starts_at: new Date(dto.startsAt),
        ends_at: dto.endsAt ? new Date(dto.endsAt) : null,
        location: dto.location ?? null,
        capacity: dto.capacity ?? null,
        notes: dto.notes ?? null,
      })
      .returning(SHIFT_COLUMNS)
      .executeTakeFirstOrThrow();
    return ok(toShiftDto(row));
  }

  @Patch('shelter/shifts/:id')
  @Auth()
  async updateShift(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShiftDto,
  ): Promise<ApiResponse<ShiftDto>> {
    await this.requireOwned(
      'volunteer_shifts',
      current.userId,
      id,
      'Créneau',
      'volunteers:write',
    );
    const kind =
      dto.kind === undefined ? undefined : ensureValue(dto.kind, SHIFT_KIND, 'type de créneau');
    const row = await this.db
      .updateTable('volunteer_shifts')
      .set((eb) => ({
        title: dto.title?.trim() ?? eb.ref('title'),
        kind: kind ?? eb.ref('kind'),
        starts_at: dto.startsAt ? new Date(dto.startsAt) : eb.ref('starts_at'),
        ends_at: dto.endsAt ? new Date(dto.endsAt) : eb.ref('ends_at'),
        location: dto.location ?? eb.ref('location'),
        capacity: dto.capacity ?? eb.ref('capacity'),
        notes: dto.notes ?? eb.ref('notes'),
        updated_at: new Date(),
      }))
      .where('id', '=', id)
      .returning(SHIFT_COLUMNS)
      .executeTakeFirstOrThrow();
    return ok(toShiftDto(row));
  }

  @Delete('shelter/shifts/:id')
  @Auth()
  async deleteShift(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<null>> {
    await this.requireOwned(
      'volunteer_shifts',
      current.userId,
      id,
      'Créneau',
      'volunteers:write',
    );
    await this.db.deleteFrom('volunteer_shifts').where('id', '=', id).execute();
    return ok(null);
  }

  // --- Inscriptions aux créneaux ---------------------------------------------------

  @Get('shelter/shifts/:shiftId/signups')
  @Auth()
  async listSignups(
    @CurrentUser() current: CurrentUserInfo,
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
  ): Promise<ApiResponse<SignupDto[]>> {
    await this.requireOwned(
      'volunteer_shifts',
      current.userId,
      shiftId,
      'Créneau',
      'volunteers:read',
    );
    const rows = await this.db
      .selectFrom('shift_signups as su')
      .innerJoin('volunteers as v', 'v.id', 'su.volunteer_id')
      .select([
        'su.id',
        'su.shift_id',
        'su.volunteer_id',
        'v.name as volunteer_name',
        'su.status',
        sql<number | null>`su.hours::float8`.as('hours'),
      ])
      .where('su.shift_id', '=', shiftId)
      .execute();
    return ok(
      rows.map((row) => ({
        id: row.id,
        shiftId: row.shift_id,
        volunteerId: row.volunteer_id,
        volunteerName: row.volunteer_name,
        status: row.status,
        hours: row.hours,
      })),
    );
  }

  @Post('shelter/shifts/:shiftId/signups')
  @Auth()
  async signup(
    @CurrentUser() current: CurrentUserInfo,
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @Body() dto: CreateSignupDto,
  ): Promise<ApiResponse<null>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'volunteers:write');
    const shiftOwner = await this.shelterIdOf('volunteer_shifts', shiftId);
    if (shiftOwner === null) throw AppError.notFoundId('Créneau', shiftId);
    const volunteerOwner = await this.shelterIdOf('volunteers', dto.volunteerId);
    if (volunteerOwner === null) throw AppError.notFoundId('Bénévole', dto.volunteerId);
    if (shiftOwner !== shelterId || volunteerOwner !== shelterId) {
      throw AppError.forbidden('Créneau ou bénévole hors de votre refuge.');
    }

    const duplicate = await this.db
      .selectFrom('shift_signups')
      .select('id')
      .where('shift_id', '=', shiftId)
      .where('volunteer_id', '=', dto.volunteerId)
      .executeTakeFirst();
    if (duplicate) throw AppError.conflict('Ce bénévole est déjà inscrit à ce créneau.');

    await this.db
      .insertInto('shift_signups')
      .values({ shift_id: shiftId, volunteer_id: dto.volunteerId, status: 'inscrit' })
      .execute();
    return ok(null);
  }

  @Patch('shelter/signups/:id')
  @Auth()
  async updateSignup(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSignupDto,
  ): Promise<ApiResponse<null>> {
    await this.requireSignupOwned(current.userId, id);
    const status =
      dto.status === undefined ? undefined : ensureValue(dto.status, SIGNUP_STATUS, 'statut');
    await this.db
      .updateTable('shift_signups')
      .set((eb) => ({
        status: status ?? eb.ref('status'),
        hours: dto.hours ?? eb.ref('hours'),
      }))
      .where('id', '=', id)
      .execute();
    return ok(null);
  }

  @Delete('shelter/signups/:id')
  @Auth()
  async removeSignup(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<null>> {
    await this.requireSignupOwned(current.userId, id);
    await this.db.deleteFrom('shift_signups').where('id', '=', id).execute();
    return ok(null);
  }

  // --- Candidature bénévole publique ------------------------------------------------

  @Post('shelters/:id/volunteer-applications')
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async applyVolunteer(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) shelterId: string,
    @Body() dto: VolunteerApplicationDto,
  ): Promise<ApiResponse<{ ok: true }>> {
    const shelter = await this.db
      .selectFrom('shelters')
      .select('is_verified')
      .where('id', '=', shelterId)
      .executeTakeFirst();
    if (!shelter?.is_verified) throw AppError.notFoundId('Refuge', shelterId);

    const applicant = await this.users.findRef(current.userId);
    if (!applicant) throw AppError.unprocessable('Profil utilisateur introuvable.');

    const already = await this.db
      .selectFrom('volunteers')
      .select('id')
      .where('shelter_id', '=', shelterId)
      .where('email', 'is not', null)
      .where((eb) => eb(eb.fn('lower', ['email']), '=', applicant.email.toLowerCase()))
      .executeTakeFirst();
    if (already) {
      throw AppError.conflict('Vous êtes déjà inscrit comme bénévole auprès de ce refuge.');
    }

    await this.db
      .insertInto('volunteers')
      .values({
        shelter_id: shelterId,
        name: applicant.name,
        email: applicant.email,
        phone: applicant.phone,
        skills: clean(dto.skills),
        availability: clean(dto.availability),
        status: 'candidate',
        notes: clean(dto.message),
      })
      .execute();
    return ok({ ok: true });
  }

  // --- Helpers d'autorisation --------------------------------------------------------

  private async shelterIdOf(
    table: 'volunteers' | 'volunteer_shifts',
    id: string,
  ): Promise<string | null> {
    const row = await this.db
      .selectFrom(table)
      .select('shelter_id')
      .where('id', '=', id)
      .executeTakeFirst();
    return row?.shelter_id ?? null;
  }

  /** Vérifie que `table.id` appartient au refuge du membre (permission donnée). */
  private async requireOwned(
    table: 'volunteers' | 'volunteer_shifts',
    userId: string,
    id: string,
    label: string,
    permission: 'volunteers:read' | 'volunteers:write',
  ): Promise<string> {
    const shelterId = await this.membership.requireAccess(userId, permission);
    const owner = await this.shelterIdOf(table, id);
    if (owner === null) throw AppError.notFoundId(label, id);
    if (owner !== shelterId) throw AppError.forbidden(`${label} hors de votre refuge.`);
    return shelterId;
  }

  /** Vérifie qu'une inscription appartient à un créneau du refuge. */
  private async requireSignupOwned(userId: string, signupId: string): Promise<void> {
    const shelterId = await this.membership.requireAccess(userId, 'volunteers:write');
    const row = await this.db
      .selectFrom('shift_signups as su')
      .innerJoin('volunteer_shifts as s', 's.id', 'su.shift_id')
      .select('s.shelter_id')
      .where('su.id', '=', signupId)
      .executeTakeFirst();
    if (!row) throw AppError.notFoundId('Inscription', signupId);
    if (row.shelter_id !== shelterId) {
      throw AppError.forbidden('Cette inscription ne concerne pas votre refuge.');
    }
  }
}

function toVolunteerDto(row: {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  skills: string | null;
  availability: string | null;
  status: string;
  notes: string | null;
  created_at: Date;
}): VolunteerDto {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    skills: row.skills,
    availability: row.availability,
    status: row.status,
    notes: row.notes,
    createdAt: toIso(row.created_at),
  };
}

function toShiftDto(row: {
  id: string;
  title: string;
  kind: string;
  starts_at: Date;
  ends_at: Date | null;
  location: string | null;
  capacity: number | null;
  notes: string | null;
}): ShiftDto {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    startsAt: toIso(row.starts_at),
    endsAt: toIsoOrNull(row.ends_at),
    location: row.location,
    capacity: row.capacity,
    notes: row.notes,
  };
}
