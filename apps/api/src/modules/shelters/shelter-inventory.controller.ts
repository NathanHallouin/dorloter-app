/**
 * Back-office refuge : stock et besoins (inventaire avec seuils d'alerte) +
 * endpoint public des besoins (articles sous le seuil). Permissions `Inventory*`.
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
import { IsNumber, IsOptional, IsString, Length } from 'class-validator';
import { sql } from 'kysely';

import { DB, type Db } from '../../infra/database/database.module';
import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { ok, type ApiResponse } from '../../shared/api-response';
import { AppError } from '../../shared/app-error';
import { ensureValue, INVENTORY_CATEGORY } from '../../shared/db-enum';
import { ShelterMembershipService } from './shelter-membership.service';
import { SheltersService } from './shelters.service';

export class CreateInventoryItemDto {
  @IsString({ message: 'Nom invalide.' })
  @Length(1, 200, { message: 'Le nom est requis.' })
  name!: string;

  @IsOptional() @IsString({ message: 'Catégorie invalide.' })
  category?: string;

  @IsOptional() @IsNumber({}, { message: 'Quantité invalide.' })
  quantity?: number;

  @IsOptional() @IsString() @Length(0, 20, { message: 'Unité trop longue.' })
  unit?: string;

  @IsOptional() @IsNumber({}, { message: 'Seuil invalide.' })
  threshold?: number;

  @IsOptional() @IsString()
  notes?: string;
}

export class UpdateInventoryItemDto {
  @IsOptional() @IsString() @Length(1, 200, { message: 'Nom invalide.' })
  name?: string;

  @IsOptional() @IsString({ message: 'Catégorie invalide.' })
  category?: string;

  @IsOptional() @IsNumber({}, { message: 'Quantité invalide.' })
  quantity?: number;

  @IsOptional() @IsString() @Length(0, 20, { message: 'Unité trop longue.' })
  unit?: string;

  @IsOptional() @IsNumber({}, { message: 'Seuil invalide.' })
  threshold?: number;

  @IsOptional() @IsString()
  notes?: string;
}

export class AdjustInventoryDto {
  @IsNumber({}, { message: 'Ajustement invalide.' })
  delta!: number;
}

interface InventoryItemDto {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string | null;
  threshold: number | null;
  notes: string | null;
}

const ITEM_COLUMNS = ['id', 'name', 'category', 'unit', 'notes'] as const;

function itemSelection() {
  return [
    ...ITEM_COLUMNS,
    sql<number>`quantity::float8`.as('quantity'),
    sql<number | null>`threshold::float8`.as('threshold'),
  ] as const;
}

@Controller('api/v1')
export class ShelterInventoryController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly membership: ShelterMembershipService,
    private readonly shelters: SheltersService,
  ) {}

  @Get('shelter/inventory')
  @Auth()
  async list(@CurrentUser() current: CurrentUserInfo): Promise<ApiResponse<InventoryItemDto[]>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'inventory:read');
    const rows = await this.db
      .selectFrom('inventory_items')
      .select(itemSelection())
      .where('shelter_id', '=', shelterId)
      .orderBy('category')
      .orderBy('name')
      .execute();
    return ok(rows.map(toDto));
  }

  @Post('shelter/inventory')
  @Auth()
  async create(
    @CurrentUser() current: CurrentUserInfo,
    @Body() dto: CreateInventoryItemDto,
  ): Promise<ApiResponse<InventoryItemDto>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'inventory:write');
    if (dto.name.trim() === '') throw AppError.unprocessable('Le nom est requis.');
    const category = ensureValue(dto.category ?? 'autre', INVENTORY_CATEGORY, 'catégorie');
    const item = await this.db
      .insertInto('inventory_items')
      .values({
        shelter_id: shelterId,
        name: dto.name.trim(),
        category,
        quantity: dto.quantity ?? 0,
        unit: dto.unit ?? null,
        threshold: dto.threshold ?? null,
        notes: dto.notes ?? null,
      })
      .returning(itemSelection())
      .executeTakeFirstOrThrow();
    return ok(toDto(item));
  }

  @Patch('shelter/inventory/:id')
  @Auth()
  async update(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInventoryItemDto,
  ): Promise<ApiResponse<InventoryItemDto>> {
    await this.requireOwned(current.userId, id);
    const category =
      dto.category === undefined
        ? undefined
        : ensureValue(dto.category, INVENTORY_CATEGORY, 'catégorie');
    const item = await this.db
      .updateTable('inventory_items')
      .set((eb) => ({
        name: dto.name?.trim() ?? eb.ref('name'),
        category: category ?? eb.ref('category'),
        quantity: dto.quantity ?? eb.ref('quantity'),
        unit: dto.unit ?? eb.ref('unit'),
        threshold: dto.threshold ?? eb.ref('threshold'),
        notes: dto.notes ?? eb.ref('notes'),
        updated_at: new Date(),
      }))
      .where('id', '=', id)
      .returning(itemSelection())
      .executeTakeFirstOrThrow();
    return ok(toDto(item));
  }

  @Post('shelter/inventory/:id/adjust')
  @Auth()
  async adjust(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustInventoryDto,
  ): Promise<ApiResponse<InventoryItemDto>> {
    await this.requireOwned(current.userId, id);
    // Plancher à 0.
    const item = await this.db
      .updateTable('inventory_items')
      .set({
        quantity: sql<number>`GREATEST(0, quantity + ${dto.delta}::numeric)`,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returning(itemSelection())
      .executeTakeFirstOrThrow();
    return ok(toDto(item));
  }

  @Delete('shelter/inventory/:id')
  @Auth()
  async remove(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<null>> {
    await this.requireOwned(current.userId, id);
    await this.db.deleteFrom('inventory_items').where('id', '=', id).execute();
    return ok(null);
  }

  /** Public : besoins du refuge (articles dont le stock est sous le seuil). */
  @Get('shelters/:slug/needs')
  async publicNeeds(
    @Param('slug') slug: string,
  ): Promise<ApiResponse<{ name: string; category: string; urgent: boolean }[]>> {
    const shelter = await this.shelters.getBySlug(slug);
    const rows = await this.db
      .selectFrom('inventory_items')
      .select(['name', 'category', sql<number>`quantity::float8`.as('quantity')])
      .where('shelter_id', '=', shelter.id)
      .where('threshold', 'is not', null)
      .where(sql<boolean>`quantity <= threshold`)
      .orderBy('quantity')
      .execute();
    return ok(
      rows.map((row) => ({
        name: row.name,
        category: row.category,
        urgent: row.quantity <= 0,
      })),
    );
  }

  private async requireOwned(userId: string, id: string): Promise<void> {
    const shelterId = await this.membership.requireAccess(userId, 'inventory:write');
    const row = await this.db
      .selectFrom('inventory_items')
      .select('shelter_id')
      .where('id', '=', id)
      .executeTakeFirst();
    if (!row) throw AppError.notFoundId('Article', id);
    if (row.shelter_id !== shelterId) {
      throw AppError.forbidden('Cet article ne concerne pas votre refuge.');
    }
  }
}

function toDto(row: {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string | null;
  threshold: number | null;
  notes: string | null;
}): InventoryItemDto {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    threshold: row.threshold,
    notes: row.notes,
  };
}
