/**
 * Module Moderation : signalements de contenu (modération a posteriori). Tout
 * utilisateur authentifié peut signaler ; seul un `platform_admin` consulte la
 * file et tranche (masquer / rejeter).
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Module,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

import { DB, type Db } from '../../infra/database/database.module';
import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { ok, type ApiResponse } from '../../shared/api-response';
import { AppError } from '../../shared/app-error';
import { bodyEnumReq, CONTENT_RESOLVE_STATUS, CONTENT_TYPE } from '../../shared/db-enum';
import { toIso } from '../../shared/format';

const PENDING_PAGE_SIZE = 100;

export class SubmitContentReportDto {
  @IsString({ message: 'Type de contenu invalide.' })
  contentType!: string;

  @IsUUID('4', { message: 'Contenu invalide.' })
  contentId!: string;

  @IsString({ message: 'Motif invalide.' })
  @Length(1, 100, { message: 'Le motif est requis (100 caractères maximum).' })
  reason!: string;

  @IsOptional() @IsString() @Length(0, 2000, { message: 'Commentaire trop long.' })
  comment?: string;
}

export class ResolveContentReportDto {
  @IsString({ message: 'Statut invalide.' })
  status!: string;
}

interface ContentReportDto {
  id: string;
  contentType: string;
  contentId: string;
  reason: string;
  comment: string | null;
  status: string;
  createdAt: string;
}

const CONTENT_REPORT_COLUMNS = [
  'id',
  'content_type',
  'content_id',
  'reason',
  'comment',
  'status',
  'created_at',
] as const;

@Controller('api/v1/moderation/reports')
export class ModerationController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Post()
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async submit(
    @CurrentUser() current: CurrentUserInfo,
    @Body() dto: SubmitContentReportDto,
  ): Promise<ApiResponse<ContentReportDto>> {
    const contentType = bodyEnumReq(dto.contentType, CONTENT_TYPE, 'contentType');
    const report = await this.db
      .insertInto('content_reports')
      .values({
        reporter_id: current.userId,
        content_type: contentType,
        content_id: dto.contentId,
        reason: dto.reason,
        comment: dto.comment ?? null,
        status: 'en_attente',
      })
      .returning(CONTENT_REPORT_COLUMNS)
      .executeTakeFirstOrThrow();
    return ok(toDto(report));
  }

  @Get()
  @Auth()
  async listPending(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<ContentReportDto[]>> {
    current.requireRole('platform_admin');
    const rows = await this.db
      .selectFrom('content_reports')
      .select(CONTENT_REPORT_COLUMNS)
      .where('status', '=', 'en_attente')
      .orderBy('created_at', 'asc')
      .limit(PENDING_PAGE_SIZE)
      .execute();
    return ok(rows.map(toDto));
  }

  @Post(':id/resolve')
  @Auth()
  async resolve(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveContentReportDto,
  ): Promise<ApiResponse<ContentReportDto>> {
    current.requireRole('platform_admin');
    // Seuls `masque` et `rejete` sont des résolutions valides.
    const status = bodyEnumReq(dto.status, CONTENT_RESOLVE_STATUS, 'status');
    const report = await this.db
      .updateTable('content_reports')
      .set({ status, resolved_by_id: current.userId, resolved_at: new Date() })
      .where('id', '=', id)
      .returning(CONTENT_REPORT_COLUMNS)
      .executeTakeFirst();
    if (!report) throw AppError.notFoundId('Signalement de contenu', id);
    return ok(toDto(report));
  }
}

function toDto(row: {
  id: string;
  content_type: string;
  content_id: string;
  reason: string;
  comment: string | null;
  status: string;
  created_at: Date;
}): ContentReportDto {
  return {
    id: row.id,
    contentType: row.content_type,
    contentId: row.content_id,
    reason: row.reason,
    comment: row.comment,
    status: row.status,
    createdAt: toIso(row.created_at),
  };
}

@Module({ controllers: [ModerationController] })
export class ModerationModule {}
