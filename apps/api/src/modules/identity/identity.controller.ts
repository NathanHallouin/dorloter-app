/**
 * Endpoints du module Identity : auth publique (register/login/refresh/logout) et
 * profil de l'utilisateur connecté (`GET`/`PATCH /api/v1/me`).
 */

import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';

import {
  Auth,
  CurrentUser,
  type CurrentUserInfo,
  ReqContext,
  type RequestContext,
} from '../../infra/security/auth.guard';
import { ok, type ApiResponse } from '../../shared/api-response';
import { toIso } from '../../shared/format';
import { LoginDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { IdentityService, type AuthResult, type UserRecord } from './identity.service';

/** Représentation publique d'un utilisateur (jamais de hash ni de donnée sensible). */
interface UserDto {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: string;
  phone: string | null;
  bio: string | null;
  city: string | null;
  isPublic: boolean;
  latitude: number | null;
  longitude: number | null;
  notificationRadiusKm: number;
  digestOptin: boolean;
  createdAt: string;
  emailVerified: boolean;
}

interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: UserDto;
}

export function toUserDto(user: UserRecord): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
    phone: user.phone,
    bio: user.bio,
    city: user.city,
    isPublic: user.is_public,
    latitude: user.location_lat,
    longitude: user.location_lng,
    notificationRadiusKm: user.notification_radius_km,
    digestOptin: user.digest_optin,
    createdAt: toIso(user.created_at),
    emailVerified: user.email_verified,
  };
}

function toTokensDto(result: AuthResult): AuthTokensDto {
  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    tokenType: 'Bearer',
    expiresIn: result.accessExpiresInSeconds,
    user: toUserDto(result.user),
  };
}

@Controller('api/v1')
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Post('auth/register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<ApiResponse<AuthTokensDto>> {
    const result = await this.identity.register(dto.email, dto.name, dto.password, ctx);
    return ok(toTokensDto(result));
  }

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<ApiResponse<AuthTokensDto>> {
    const result = await this.identity.login(dto.email, dto.password, ctx);
    return ok(toTokensDto(result));
  }

  @Post('auth/refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<ApiResponse<AuthTokensDto>> {
    const result = await this.identity.refresh(dto.refreshToken, ctx);
    return ok(toTokensDto(result));
  }

  @Post('auth/logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.identity.logout(dto.refreshToken);
  }

  @Get('me')
  @Auth()
  async me(@CurrentUser() current: CurrentUserInfo): Promise<ApiResponse<UserDto>> {
    return ok(toUserDto(await this.identity.loadUser(current.userId)));
  }

  @Patch('me')
  @Auth()
  async updateProfile(
    @CurrentUser() current: CurrentUserInfo,
    @Body() dto: UpdateProfileDto,
  ): Promise<ApiResponse<UserDto>> {
    return ok(toUserDto(await this.identity.updateProfile(current.userId, dto)));
  }
}
