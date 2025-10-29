/**
 * Back-office refuge : bibliothèque de modèles de réponses aux candidatures.
 * Textes pré-rédigés par catégorie, avec variables ({{prenomCandidat}},
 * {{nomAnimal}}, {{nomRefuge}}) résolues côté client au moment de l'usage.
 * Permissions `Communications*`.
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
import { IsIn, IsOptional, IsString, Length } from 'class-validator';

import { DB, type Db } from '../../infra/database/database.module';
import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { ok, type ApiResponse } from '../../shared/api-response';
import { AppError } from '../../shared/app-error';
import { TEMPLATE_CATEGORY } from '../../shared/db-enum';
import { toIso } from '../../shared/format';
import { ShelterMembershipService } from './shelter-membership.service';

export class CreateTemplateDto {
  @IsOptional()
  @IsIn(TEMPLATE_CATEGORY, { message: 'Catégorie invalide.' })
  category?: string;

  @IsString({ message: 'Nom invalide.' })
  @Length(1, 120, { message: 'Le nom doit faire entre 1 et 120 caractères.' })
  name!: string;

  @IsOptional() @IsString() @Length(0, 255, { message: 'Objet trop long.' })
  subject?: string;

  @IsString({ message: 'Message invalide.' })
  @Length(1, 100000, { message: 'Le message est requis.' })
  body!: string;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsIn(TEMPLATE_CATEGORY, { message: 'Catégorie invalide.' })
  category?: string;

  @IsOptional() @IsString() @Length(1, 120, { message: 'Nom invalide.' })
  name?: string;

  @IsOptional() @IsString() @Length(0, 255, { message: 'Objet trop long.' })
  subject?: string;

  @IsOptional() @IsString() @Length(1, 100000, { message: 'Message invalide.' })
  body?: string;
}

interface TemplateDto {
  id: string;
  category: string;
  name: string;
  subject: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

const TEMPLATE_COLUMNS = [
  'id',
  'category',
  'name',
  'subject',
  'body',
  'created_at',
  'updated_at',
] as const;

@Controller('api/v1/shelter/response-templates')
export class ShelterTemplatesController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly membership: ShelterMembershipService,
  ) {}

  @Get()
  @Auth()
  async list(@CurrentUser() current: CurrentUserInfo): Promise<ApiResponse<TemplateDto[]>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'communications:read');
    const rows = await this.db
      .selectFrom('response_templates')
      .select(TEMPLATE_COLUMNS)
      .where('shelter_id', '=', shelterId)
      .orderBy('category')
      .orderBy('name')
      .execute();
    return ok(rows.map(toDto));
  }

  @Post()
  @Auth()
  async create(
    @CurrentUser() current: CurrentUserInfo,
    @Body() dto: CreateTemplateDto,
  ): Promise<ApiResponse<TemplateDto>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'communications:write');
    const template = await this.db
      .insertInto('response_templates')
      .values({
        shelter_id: shelterId,
        category: dto.category ?? 'generique',
        name: dto.name.trim(),
        subject: dto.subject ?? null,
        body: dto.body,
      })
      .returning(TEMPLATE_COLUMNS)
      .executeTakeFirstOrThrow();
    return ok(toDto(template));
  }

  @Patch(':id')
  @Auth()
  async update(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTemplateDto,
  ): Promise<ApiResponse<TemplateDto>> {
    await this.requireOwned(current.userId, id);
    const template = await this.db
      .updateTable('response_templates')
      .set((eb) => ({
        category: dto.category ?? eb.ref('category'),
        name: dto.name?.trim() ?? eb.ref('name'),
        subject: dto.subject ?? eb.ref('subject'),
        body: dto.body ?? eb.ref('body'),
        updated_at: new Date(),
      }))
      .where('id', '=', id)
      .returning(TEMPLATE_COLUMNS)
      .executeTakeFirstOrThrow();
    return ok(toDto(template));
  }

  @Delete(':id')
  @Auth()
  async remove(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<null>> {
    await this.requireOwned(current.userId, id);
    await this.db.deleteFrom('response_templates').where('id', '=', id).execute();
    return ok(null);
  }

  private async requireOwned(userId: string, id: string): Promise<void> {
    const shelterId = await this.membership.requireAccess(userId, 'communications:write');
    const row = await this.db
      .selectFrom('response_templates')
      .select('shelter_id')
      .where('id', '=', id)
      .executeTakeFirst();
    if (!row) throw AppError.notFoundId('Modèle', id);
    if (row.shelter_id !== shelterId) {
      throw AppError.forbidden('Ce modèle ne concerne pas votre refuge.');
    }
  }
}

function toDto(row: {
  id: string;
  category: string;
  name: string;
  subject: string | null;
  body: string;
  created_at: Date;
  updated_at: Date;
}): TemplateDto {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    subject: row.subject,
    body: row.body,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}
