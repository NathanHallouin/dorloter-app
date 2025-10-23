/**
 * Back-office refuge : suivi médical et sanitaire des animaux (journal
 * d'événements de santé + échéances à venir). Autorisation via les animaux du
 * refuge (`PetsRead`/`PetsWrite`).
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
  Query,
} from '@nestjs/common';
import { IsDateString, IsNumber, IsOptional, IsString, Length } from 'class-validator';
import { sql } from 'kysely';

import { DB, type Db } from '../../infra/database/database.module';
import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { ok, type ApiResponse } from '../../shared/api-response';
import { AppError } from '../../shared/app-error';
import { bodyEnumReq, HEALTH_EVENT_TYPE } from '../../shared/db-enum';
import { toIso } from '../../shared/format';
import { queryInt } from '../../shared/validation';
import { ShelterMembershipService } from '../shelters/shelter-membership.service';

const DEFAULT_UPCOMING_DAYS = 60;

export class CreateHealthEventDto {
  @IsString({ message: "Type d'événement invalide." }) type!: string;
  @IsOptional() @IsDateString({}, { message: 'Date invalide.' }) eventDate?: string;
  @IsOptional() @IsString() @Length(0, 200, { message: 'Libellé trop long.' }) label?: string;
  @IsOptional() @IsString() @Length(0, 200, { message: 'Vétérinaire trop long.' }) vetLabel?: string;
  @IsOptional() @IsString() result?: string;
  @IsOptional() @IsDateString({}, { message: 'Date de rappel invalide.' }) nextDueDate?: string;
  @IsOptional() @IsNumber({}, { message: 'Coût invalide.' }) cost?: number;
  @IsOptional() @IsNumber({}, { message: 'Poids invalide.' }) weightKg?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() documentUrl?: string;
}

export class UpdateHealthEventDto {
  @IsOptional() @IsDateString({}, { message: 'Date invalide.' }) eventDate?: string;
  @IsOptional() @IsString() @Length(0, 200, { message: 'Libellé trop long.' }) label?: string;
  @IsOptional() @IsString() @Length(0, 200, { message: 'Vétérinaire trop long.' }) vetLabel?: string;
  @IsOptional() @IsString() result?: string;
  @IsOptional() @IsDateString({}, { message: 'Date de rappel invalide.' }) nextDueDate?: string;
  @IsOptional() @IsNumber({}, { message: 'Coût invalide.' }) cost?: number;
  @IsOptional() @IsNumber({}, { message: 'Poids invalide.' }) weightKg?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() documentUrl?: string;
}

interface HealthEventDto {
  id: string;
  petId: string;
  type: string;
  eventDate: string;
  label: string | null;
  vetLabel: string | null;
  result: string | null;
  nextDueDate: string | null;
  cost: number | null;
  weightKg: number | null;
  notes: string | null;
  documentUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

const HEALTH_COLUMNS = [
  'id',
  'pet_id',
  'type',
  'event_date',
  'label',
  'vet_label',
  'result',
  'next_due_date',
  'notes',
  'document_url',
  'created_at',
  'updated_at',
] as const;

function healthSelection() {
  return [
    ...HEALTH_COLUMNS,
    sql<number | null>`cost::float8`.as('cost'),
    sql<number | null>`weight_kg::float8`.as('weight_kg'),
  ] as const;
}

@Controller('api/v1/shelter')
export class AdoptionHealthController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly membership: ShelterMembershipService,
  ) {}

  @Get('pets/:petId/health')
  @Auth()
  async listForPet(
    @CurrentUser() current: CurrentUserInfo,
    @Param('petId', ParseUUIDPipe) petId: string,
  ): Promise<ApiResponse<HealthEventDto[]>> {
    await this.requirePet(current.userId, petId, 'pets:read');
    const rows = await this.db
      .selectFrom('health_events')
      .select(healthSelection())
      .where('pet_id', '=', petId)
      .orderBy('event_date', 'desc')
      .orderBy('created_at', 'desc')
      .execute();
    return ok(rows.map(toDto));
  }

  @Post('pets/:petId/health')
  @Auth()
  async create(
    @CurrentUser() current: CurrentUserInfo,
    @Param('petId', ParseUUIDPipe) petId: string,
    @Body() dto: CreateHealthEventDto,
  ): Promise<ApiResponse<HealthEventDto>> {
    await this.requirePet(current.userId, petId, 'pets:write');
    const type = bodyEnumReq(dto.type, HEALTH_EVENT_TYPE, 'type');
    const event = await this.db
      .insertInto('health_events')
      .values({
        pet_id: petId,
        type,
        event_date: dto.eventDate ?? today(),
        label: dto.label ?? null,
        vet_label: dto.vetLabel ?? null,
        result: dto.result ?? null,
        next_due_date: dto.nextDueDate ?? null,
        cost: dto.cost ?? null,
        weight_kg: dto.weightKg ?? null,
        notes: dto.notes ?? null,
        document_url: dto.documentUrl ?? null,
      })
      .returning(healthSelection())
      .executeTakeFirstOrThrow();
    return ok(toDto(event));
  }

  /** Échéances à venir (vaccins, vermifuges à refaire) sur les animaux du refuge. */
  @Get('health/upcoming')
  @Auth()
  async upcoming(
    @CurrentUser() current: CurrentUserInfo,
    @Query() query: Record<string, unknown>,
  ): Promise<
    ApiResponse<{ petId: string; petName: string; event: HealthEventDto }[]>
  > {
    const shelterId = await this.membership.requireAccess(current.userId, 'pets:read');
    const days = queryInt(query.days, 'days') ?? DEFAULT_UPCOMING_DAYS;
    const rows = await this.db
      .selectFrom('health_events as h')
      .innerJoin('pets as p', 'p.id', 'h.pet_id')
      .select([
        'h.id',
        'h.pet_id',
        'h.type',
        'h.event_date',
        'h.label',
        'h.vet_label',
        'h.result',
        'h.next_due_date',
        'h.notes',
        'h.document_url',
        'h.created_at',
        'h.updated_at',
        sql<number | null>`h.cost::float8`.as('cost'),
        sql<number | null>`h.weight_kg::float8`.as('weight_kg'),
        'p.name as pet_name',
      ])
      .where('h.next_due_date', 'is not', null)
      .where(sql<boolean>`h.next_due_date <= current_date + ${days}::int`)
      .where('p.shelter_id', '=', shelterId)
      .orderBy('h.next_due_date', 'asc')
      .execute();

    return ok(
      rows.map((row) => ({
        petId: row.pet_id,
        petName: row.pet_name,
        event: toDto(row),
      })),
    );
  }

  @Patch('health/:id')
  @Auth()
  async update(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHealthEventDto,
  ): Promise<ApiResponse<HealthEventDto>> {
    const existing = await this.loadEvent(id);
    await this.requirePet(current.userId, existing.pet_id, 'pets:write');
    const updated = await this.db
      .updateTable('health_events')
      .set((eb) => ({
        event_date: dto.eventDate ?? eb.ref('event_date'),
        label: dto.label ?? eb.ref('label'),
        vet_label: dto.vetLabel ?? eb.ref('vet_label'),
        result: dto.result ?? eb.ref('result'),
        next_due_date: dto.nextDueDate ?? eb.ref('next_due_date'),
        cost: dto.cost ?? eb.ref('cost'),
        weight_kg: dto.weightKg ?? eb.ref('weight_kg'),
        notes: dto.notes ?? eb.ref('notes'),
        document_url: dto.documentUrl ?? eb.ref('document_url'),
        updated_at: new Date(),
      }))
      .where('id', '=', id)
      .returning(healthSelection())
      .executeTakeFirstOrThrow();
    return ok(toDto(updated));
  }

  @Delete('health/:id')
  @Auth()
  async remove(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<null>> {
    const existing = await this.loadEvent(id);
    await this.requirePet(current.userId, existing.pet_id, 'pets:write');
    await this.db.deleteFrom('health_events').where('id', '=', id).execute();
    return ok(null);
  }

  private async loadEvent(id: string): Promise<{ pet_id: string }> {
    const event = await this.db
      .selectFrom('health_events')
      .select('pet_id')
      .where('id', '=', id)
      .executeTakeFirst();
    if (!event) throw AppError.notFoundId('Événement de santé', id);
    return event;
  }

  private async requirePet(
    userId: string,
    petId: string,
    permission: 'pets:read' | 'pets:write',
  ): Promise<void> {
    const shelterId = await this.membership.requireAccess(userId, permission);
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
  pet_id: string;
  type: string;
  event_date: string;
  label: string | null;
  vet_label: string | null;
  result: string | null;
  next_due_date: string | null;
  cost: number | null;
  weight_kg: number | null;
  notes: string | null;
  document_url: string | null;
  created_at: Date;
  updated_at: Date;
}): HealthEventDto {
  return {
    id: row.id,
    petId: row.pet_id,
    type: row.type,
    eventDate: row.event_date,
    label: row.label,
    vetLabel: row.vet_label,
    result: row.result,
    nextDueDate: row.next_due_date,
    cost: row.cost,
    weightKg: row.weight_kg,
    notes: row.notes,
    documentUrl: row.document_url,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
