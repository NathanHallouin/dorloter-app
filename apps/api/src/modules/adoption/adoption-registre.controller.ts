/**
 * Back-office refuge : registre d'entrée/sortie des animaux (obligation légale)
 * et statistiques associées. Permissions `PetsRead`/`PetsWrite`.
 */

import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { IsDateString, IsOptional, IsString, Length } from 'class-validator';
import { sql } from 'kysely';

import { DB, type Db } from '../../infra/database/database.module';
import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { ok, type ApiResponse } from '../../shared/api-response';
import { AppError } from '../../shared/app-error';
import { ensureValue, INTAKE_ORIGIN, OUTCOME_TYPE } from '../../shared/db-enum';
import { ShelterMembershipService } from '../shelters/shelter-membership.service';

export class SetIntakeDto {
  @IsOptional() @IsDateString({}, { message: "Date d'entrée invalide." }) date?: string;
  @IsOptional() @IsString({ message: 'Provenance invalide.' }) origin?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() @Length(0, 15, { message: 'Numéro ICAD trop long.' })
  icadNumber?: string;
}

export class SetOutcomeDto {
  @IsOptional() @IsDateString({}, { message: 'Date de sortie invalide.' }) date?: string;
  @IsOptional() @IsString({ message: 'Motif de sortie invalide.' }) type?: string;
  @IsOptional() @IsString() notes?: string;
}

interface RegistreEntryDto {
  id: string;
  name: string;
  species: string;
  icadNumber: string | null;
  intakeDate: string | null;
  intakeOrigin: string | null;
  intakeNotes: string | null;
  outcomeDate: string | null;
  outcomeType: string | null;
  outcomeNotes: string | null;
  status: string;
}

interface RegistreStatsDto {
  total: number;
  present: number;
  presentCats: number;
  presentDogs: number;
  enteredThisYear: number;
  adoptionsThisYear: number;
  avgStayDays: number | null;
}

const REGISTRE_COLUMNS = [
  'id',
  'name',
  'species',
  'icad_number',
  'intake_date',
  'intake_origin',
  'intake_notes',
  'outcome_date',
  'outcome_type',
  'outcome_notes',
  'status',
] as const;

@Controller('api/v1/shelter')
export class AdoptionRegistreController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly membership: ShelterMembershipService,
  ) {}

  @Get('registre')
  @Auth()
  async list(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<RegistreEntryDto[]>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'pets:read');
    const rows = await this.db
      .selectFrom('pets')
      .select(REGISTRE_COLUMNS)
      .where('shelter_id', '=', shelterId)
      .orderBy('created_at', 'desc')
      .execute();
    return ok(rows.map(toDto));
  }

  @Get('registre/stats')
  @Auth()
  async stats(@CurrentUser() current: CurrentUserInfo): Promise<ApiResponse<RegistreStatsDto>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'pets:read');
    const row = await this.db
      .selectFrom('pets')
      .select([
        sql<number>`count(*)`.as('total'),
        sql<number>`count(*) FILTER (WHERE outcome_date IS NULL)`.as('present'),
        sql<number>`count(*) FILTER (WHERE outcome_date IS NULL AND species = 'chat')`.as(
          'present_cats',
        ),
        sql<number>`count(*) FILTER (WHERE outcome_date IS NULL AND species = 'chien')`.as(
          'present_dogs',
        ),
        sql<number>`count(*) FILTER (WHERE EXTRACT(YEAR FROM intake_date) = EXTRACT(YEAR FROM now()))`.as(
          'entered_this_year',
        ),
        sql<number>`count(*) FILTER (WHERE outcome_type = 'adoption' AND EXTRACT(YEAR FROM outcome_date) = EXTRACT(YEAR FROM now()))`.as(
          'adoptions_this_year',
        ),
        sql<
          number | null
        >`AVG(outcome_date - intake_date) FILTER (WHERE intake_date IS NOT NULL AND outcome_date IS NOT NULL)::float8`.as(
          'avg_stay_days',
        ),
      ])
      .where('shelter_id', '=', shelterId)
      .executeTakeFirstOrThrow();

    return ok({
      total: row.total,
      present: row.present,
      presentCats: row.present_cats,
      presentDogs: row.present_dogs,
      enteredThisYear: row.entered_this_year,
      adoptionsThisYear: row.adoptions_this_year,
      avgStayDays: row.avg_stay_days,
    });
  }

  @Patch('pets/:petId/intake')
  @Auth()
  async setIntake(
    @CurrentUser() current: CurrentUserInfo,
    @Param('petId', ParseUUIDPipe) petId: string,
    @Body() dto: SetIntakeDto,
  ): Promise<ApiResponse<RegistreEntryDto>> {
    await this.requireOwnedPet(current.userId, petId);
    if (dto.origin !== undefined) ensureValue(dto.origin, INTAKE_ORIGIN, 'provenance');
    const pet = await this.db
      .updateTable('pets')
      .set((eb) => ({
        intake_date: dto.date ?? eb.fn.coalesce('intake_date', sql<string>`current_date`),
        intake_origin: dto.origin ?? eb.ref('intake_origin'),
        intake_notes: dto.notes ?? eb.ref('intake_notes'),
        icad_number: dto.icadNumber ?? eb.ref('icad_number'),
        updated_at: new Date(),
      }))
      .where('id', '=', petId)
      .returning(REGISTRE_COLUMNS)
      .executeTakeFirstOrThrow();
    return ok(toDto(pet));
  }

  @Patch('pets/:petId/outcome')
  @Auth()
  async setOutcome(
    @CurrentUser() current: CurrentUserInfo,
    @Param('petId', ParseUUIDPipe) petId: string,
    @Body() dto: SetOutcomeDto,
  ): Promise<ApiResponse<RegistreEntryDto>> {
    await this.requireOwnedPet(current.userId, petId);
    if (dto.type !== undefined) ensureValue(dto.type, OUTCOME_TYPE, 'motif de sortie');
    const pet = await this.db
      .updateTable('pets')
      .set((eb) => ({
        outcome_date: dto.date ?? eb.fn.coalesce('outcome_date', sql<string>`current_date`),
        outcome_type: dto.type ?? eb.ref('outcome_type'),
        outcome_notes: dto.notes ?? eb.ref('outcome_notes'),
        updated_at: new Date(),
      }))
      .where('id', '=', petId)
      .returning(REGISTRE_COLUMNS)
      .executeTakeFirstOrThrow();
    return ok(toDto(pet));
  }

  private async requireOwnedPet(userId: string, petId: string): Promise<void> {
    const shelterId = await this.membership.requireAccess(userId, 'pets:write');
    const pet = await this.db
      .selectFrom('pets')
      .select('shelter_id')
      .where('id', '=', petId)
      .executeTakeFirst();
    if (!pet) throw AppError.notFoundId('Animal', petId);
    if (pet.shelter_id !== shelterId) {
      throw AppError.forbidden('Cet animal ne concerne pas votre refuge.');
    }
  }
}

function toDto(row: {
  id: string;
  name: string;
  species: string;
  icad_number: string | null;
  intake_date: string | null;
  intake_origin: string | null;
  intake_notes: string | null;
  outcome_date: string | null;
  outcome_type: string | null;
  outcome_notes: string | null;
  status: string;
}): RegistreEntryDto {
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    icadNumber: row.icad_number,
    intakeDate: row.intake_date,
    intakeOrigin: row.intake_origin,
    intakeNotes: row.intake_notes,
    outcomeDate: row.outcome_date,
    outcomeType: row.outcome_type,
    outcomeNotes: row.outcome_notes,
    status: row.status,
  };
}
