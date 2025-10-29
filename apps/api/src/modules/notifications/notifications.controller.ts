/**
 * Module Notifications : centre de notifications in-app (persistées) +
 * enregistrement des devices push (Expo).
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
  Post,
} from '@nestjs/common';
import { IsOptional, IsString, Length } from 'class-validator';

import { DB, type Db } from '../../infra/database/database.module';
import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { ok, type ApiResponse } from '../../shared/api-response';
import { AppError } from '../../shared/app-error';
import { bodyEnumReq, DEVICE_PLATFORM } from '../../shared/db-enum';
import { toIso } from '../../shared/format';

const MAX_PAGE = 50;

export class RegisterDeviceDto {
  @IsString({ message: 'Jeton push invalide.' })
  @Length(1, 512, { message: 'Jeton push requis.' })
  expoPushToken!: string;

  @IsString({ message: 'Plateforme invalide.' })
  platform!: string;

  @IsOptional() @IsString() @Length(0, 255, { message: "Nom d'appareil trop long." })
  deviceName?: string;
}

interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: unknown;
  isRead: boolean;
  createdAt: string;
}

const NOTIFICATION_COLUMNS = [
  'id',
  'type',
  'title',
  'body',
  'data',
  'is_read',
  'created_at',
] as const;

@Controller('api/v1')
export class NotificationsController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get('notifications')
  @Auth()
  async list(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<NotificationDto[]>> {
    const rows = await this.db
      .selectFrom('notifications')
      .select(NOTIFICATION_COLUMNS)
      .where('user_id', '=', current.userId)
      .orderBy('created_at', 'desc')
      .limit(MAX_PAGE)
      .execute();
    return ok(
      rows.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        data: row.data,
        isRead: row.is_read,
        createdAt: toIso(row.created_at),
      })),
    );
  }

  @Get('notifications/unread-count')
  @Auth()
  async unreadCount(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<{ count: number }>> {
    const row = await this.db
      .selectFrom('notifications')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('user_id', '=', current.userId)
      .where('is_read', '=', false)
      .executeTakeFirstOrThrow();
    return ok({ count: row.count });
  }

  @Post('notifications/:id/read')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async markRead(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    const result = await this.db
      .updateTable('notifications')
      .set({ is_read: true })
      .where('id', '=', id)
      .where('user_id', '=', current.userId)
      .executeTakeFirst();
    if (result.numUpdatedRows === 0n) throw AppError.notFoundId('Notification', id);
  }

  @Post('notifications/read-all')
  @Auth()
  async markAllRead(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<{ updated: number }>> {
    const result = await this.db
      .updateTable('notifications')
      .set({ is_read: true })
      .where('user_id', '=', current.userId)
      .where('is_read', '=', false)
      .executeTakeFirst();
    return ok({ updated: Number(result.numUpdatedRows) });
  }

  @Post('devices/register')
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async registerDevice(
    @CurrentUser() current: CurrentUserInfo,
    @Body() dto: RegisterDeviceDto,
  ): Promise<ApiResponse<{ id: string }>> {
    const platform = bodyEnumReq(dto.platform, DEVICE_PLATFORM, 'platform');
    // Idempotent : upsert sur (user_id, expo_push_token).
    const row = await this.db
      .insertInto('device_tokens')
      .values({
        user_id: current.userId,
        expo_push_token: dto.expoPushToken,
        platform,
        device_name: dto.deviceName ?? null,
        last_seen_at: new Date(),
      })
      .onConflict((oc) =>
        oc.columns(['user_id', 'expo_push_token']).doUpdateSet({
          platform,
          device_name: dto.deviceName ?? null,
          last_seen_at: new Date(),
        }),
      )
      .returning('id')
      .executeTakeFirstOrThrow();
    return ok({ id: row.id });
  }

  @Delete('devices/:id')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDevice(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.db
      .deleteFrom('device_tokens')
      .where('id', '=', id)
      .where('user_id', '=', current.userId)
      .execute();
  }
}
