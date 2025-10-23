import { Body, Controller, Param, ParseUUIDPipe, Post, Get } from '@nestjs/common';
import { IsOptional, IsString, Length } from 'class-validator';

import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { ok, type ApiResponse } from '../../shared/api-response';
import { clean } from '../../shared/format';
import { AdoptionFollowupsService, type FollowupDto } from './adoption-followups.service';

export class CompleteFollowupDto {
  @IsOptional()
  @IsString({ message: 'Notes invalides.' })
  @Length(0, 2000, { message: 'Notes trop longues.' })
  notes?: string;
}

@Controller('api/v1/shelter/followups')
export class AdoptionFollowupsController {
  constructor(private readonly followups: AdoptionFollowupsService) {}

  @Get()
  @Auth()
  async list(@CurrentUser() current: CurrentUserInfo): Promise<ApiResponse<FollowupDto[]>> {
    return ok(await this.followups.list(current.userId));
  }

  @Post(':id/complete')
  @Auth()
  async complete(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteFollowupDto,
  ): Promise<ApiResponse<FollowupDto>> {
    return ok(await this.followups.complete(current.userId, id, clean(dto.notes)));
  }

  @Post(':id/cancel')
  @Auth()
  async cancel(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<null>> {
    await this.followups.cancel(current.userId, id);
    return ok(null);
  }

  @Post(':id/reopen')
  @Auth()
  async reopen(
    @CurrentUser() current: CurrentUserInfo,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<FollowupDto>> {
    return ok(await this.followups.reopen(current.userId, id));
  }
}
